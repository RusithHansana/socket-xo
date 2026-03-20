import { expect, type Page } from '@playwright/test';

export type CellSymbol = 'X' | 'O' | 'empty';

export async function navigateToLobby(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
}

export async function clickPlayAI(page: Page): Promise<void> {
  await page.getByRole('button', { name: /play ai/i }).click();
  await expect(page).toHaveURL(/\/ai$/);
  await waitForBoardReady(page);
}

export async function clickPlayOnline(page: Page): Promise<void> {
  await page.getByRole('button', { name: /play online/i }).click();
}

export async function waitForBoardReady(page: Page): Promise<void> {
  await expect(page.getByRole('grid', { name: /tic-tac-toe game board/i })).toBeVisible();
  await expect(page.locator('#cell-0-0')).toBeVisible();
}

export async function clickBoardCell(page: Page, row: number, col: number): Promise<void> {
  await page.locator(`#cell-${row}-${col}`).click();
}

export async function waitForTurnIndicatorChange(page: Page, previousText: string): Promise<string> {
  const turnIndicator = page.getByText(/your turn|opponent's turn/i).first();
  await expect(turnIndicator).toBeVisible();

  await expect
    .poll(async () => {
      const text = await turnIndicator.textContent();
      return text?.trim() ?? '';
    })
    .not.toBe(previousText);

  return (await turnIndicator.textContent())?.trim() ?? '';
}

export async function getTurnIndicatorText(page: Page): Promise<string> {
  const turnIndicator = page.getByText(/your turn|opponent's turn/i).first();
  await expect(turnIndicator).toBeVisible();
  return (await turnIndicator.textContent())?.trim() ?? '';
}

export async function getCellSymbol(page: Page, row: number, col: number): Promise<CellSymbol> {
  const ariaLabel = await page.locator(`#cell-${row}-${col}`).getAttribute('aria-label');
  if (ariaLabel === null) {
    throw new Error(`Missing aria-label for cell (${row}, ${col})`);
  }

  const lower = ariaLabel.toLowerCase();
  if (lower.includes(', x')) {
    return 'X';
  }

  if (lower.includes(', o')) {
    return 'O';
  }

  return 'empty';
}

export async function assertBoardCellContent(
  page: Page,
  row: number,
  col: number,
  expected: CellSymbol,
): Promise<void> {
  await expect
    .poll(async () => getCellSymbol(page, row, col))
    .toBe(expected);
}

export async function assertGameOutcomeModalContent(page: Page, expectedHeading: RegExp): Promise<void> {
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { level: 2 })).toHaveText(expectedHeading);
}

export async function returnToLobbyFromOutcomeModal(page: Page): Promise<void> {
  const backButton = page.getByRole('button', { name: /back to lobby/i });
  await expect(backButton).toBeVisible();
  await backButton.click();
  await expect(page).toHaveURL(/\/$/);
}
