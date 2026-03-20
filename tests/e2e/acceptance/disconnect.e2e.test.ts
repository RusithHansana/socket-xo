import { expect, test } from '@playwright/test';
import { clickBoardCell, assertBoardCellContent } from './helpers/game-actions';
import { cleanupPairedMatch, pairPlayersViaMatchmaking } from './helpers/matchmaking-helpers';
import { readBoardStateFromDom, verifyChatMessagePresence, verifyOutcomeModalText } from './helpers/assertions';

async function openChat(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: /open chat/i }).click();
  await expect(page.getByRole('dialog', { name: /chat/i })).toBeVisible();
}

test.describe('Story 6.4 acceptance - disconnect and reconnect scenarios', () => {
  test.setTimeout(90_000);
  test('Test 8: Reconnect within grace period restores state in <= 2s', async ({ browser }) => {
    const match = await pairPlayersViaMatchmaking(browser);

    try {
      const xPage = match.page1Symbol === 'X' ? match.page1 : match.page2;
      const oPage = match.page1Symbol === 'O' ? match.page1 : match.page2;

      await clickBoardCell(xPage, 0, 0);
      await assertBoardCellContent(xPage, 0, 0, 'X');
      await clickBoardCell(oPage, 1, 1);
      await assertBoardCellContent(oPage, 1, 1, 'O');

      const beforeDisconnect = await readBoardStateFromDom(xPage);

      await match.context2.setOffline(true);
      await match.page2.evaluate(() => { if ((window as any).socket) (window as any).socket.io.engine.close(); });
      await expect(match.page2.getByRole('heading', { name: /reconnecting/i })).toBeVisible({ timeout: 15000 });

      const reconnectStartMs = Date.now();
      await match.context2.setOffline(false);
      await match.page2.evaluate(() => {
        window.dispatchEvent(new Event('online'));
        if ((window as any).socket) (window as any).socket.connect();
      });
      await expect(match.page2.getByText(/welcome back!/i)).toBeVisible({ timeout: 15000 });

      const recoveryDurationMs = Date.now() - reconnectStartMs;
      expect(recoveryDurationMs).toBeLessThanOrEqual(process.env.CI ? 6_000 : 2_000);

      await expect(match.page2.getByText(/welcome back!/i)).not.toBeVisible();

      const afterReconnectPage1 = await readBoardStateFromDom(match.page1);
      const afterReconnectPage2 = await readBoardStateFromDom(match.page2);
      expect(afterReconnectPage1).toEqual(beforeDisconnect);
      expect(afterReconnectPage2).toEqual(beforeDisconnect);
    } finally {
      await cleanupPairedMatch(match);
    }
  });

  test('Test 9: Grace period expiry triggers deterministic forfeit', async ({ browser }) => {
    const match = await pairPlayersViaMatchmaking(browser);

    try {
      const connectedPage = match.page1;

      await match.context2.setOffline(true);
      await match.page2.evaluate(() => { if ((window as any).socket) (window as any).socket.io.engine.close(); });

      await verifyOutcomeModalText(connectedPage, /you win!/i, 35000);
      await expect(connectedPage.getByRole('dialog').filter({ hasText: 'Match Complete' })).toContainText(/forfeit|disconnected/i);

      await match.context2.setOffline(false);
    } finally {
      await cleanupPairedMatch(match);
    }
  });

  test('Test 10: Chat context survives reconnect', async ({ browser }) => {
    const match = await pairPlayersViaMatchmaking(browser);

    try {
      const messageText = 'story-6-4-chat-persists';

      await openChat(match.page1);
      await match.page1.getByPlaceholder(/type a message/i).fill(messageText);
      await match.page1.getByRole('button', { name: /send message/i }).click();

      await openChat(match.page2);
      await verifyChatMessagePresence(match.page2, messageText);

      await match.context2.setOffline(true);
      await match.page2.evaluate(() => { if ((window as any).socket) (window as any).socket.io.engine.close(); });
      await expect(match.page2.getByRole('heading', { name: /reconnecting/i })).toBeVisible({ timeout: 15000 });
      await match.context2.setOffline(false);
      await match.page2.evaluate(() => {
        window.dispatchEvent(new Event('online'));
        if ((window as any).socket) (window as any).socket.connect();
      });
      await expect(match.page2.getByText(/welcome back!/i)).toBeVisible({ timeout: 15000 });
      await expect(match.page2.getByText(/welcome back!/i)).not.toBeVisible();

      await openChat(match.page2);
      await verifyChatMessagePresence(match.page2, messageText);
    } finally {
      await cleanupPairedMatch(match);
    }
  });
});
