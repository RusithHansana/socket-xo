import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { clickPlayOnline, navigateToLobby, waitForBoardReady } from './game-actions';

export type PlayerSymbol = 'X' | 'O';

export interface PairedMatch {
  context1: BrowserContext;
  context2: BrowserContext;
  page1: Page;
  page2: Page;
  roomId: string;
  page1Symbol: PlayerSymbol;
  page2Symbol: PlayerSymbol;
}

function parseRoomIdFromUrl(url: string): string {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/^\/game\/([^/]+)$/);
  if (match === null) {
    throw new Error(`Expected game URL, got: ${url}`);
  }
  return match[1];
}

async function detectSymbol(page: Page): Promise<PlayerSymbol> {
  await expect(page.getByText(/your turn|opponent's turn/i).first()).toBeVisible();
  const turnText = (await page.getByText(/your turn|opponent's turn/i).first().textContent())?.trim().toLowerCase() ?? '';
  return turnText.includes('your turn') ? 'X' : 'O';
}

export async function pairPlayersViaMatchmaking(browser: Browser): Promise<PairedMatch> {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  await Promise.all([navigateToLobby(page1), navigateToLobby(page2)]);
  await Promise.all([clickPlayOnline(page1), clickPlayOnline(page2)]);

  await Promise.all([
    page1.waitForURL(/\/game\/[^/]+$/),
    page2.waitForURL(/\/game\/[^/]+$/),
  ]);

  const roomIdPage1 = parseRoomIdFromUrl(page1.url());
  const roomIdPage2 = parseRoomIdFromUrl(page2.url());
  expect(roomIdPage1).toBe(roomIdPage2);

  await Promise.all([waitForBoardReady(page1), waitForBoardReady(page2)]);

  const page1Symbol = await detectSymbol(page1);
  const page2Symbol = page1Symbol === 'X' ? 'O' : 'X';

  return {
    context1,
    context2,
    page1,
    page2,
    roomId: roomIdPage1,
    page1Symbol,
    page2Symbol,
  };
}

export async function cleanupPairedMatch(match: PairedMatch): Promise<void> {
  await Promise.allSettled([match.context1.close(), match.context2.close()]);
}
