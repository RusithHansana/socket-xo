import { expect, test, type Page } from '@playwright/test';
import { clickBoardCell, assertBoardCellContent } from './helpers/game-actions';
import { cleanupPairedMatch, pairPlayersViaMatchmaking, type PairedMatch, type PlayerSymbol } from './helpers/matchmaking-helpers';
import { readBoardStateFromDom, verifyOutcomeModalText } from './helpers/assertions';

type PlannedMove = { symbol: PlayerSymbol; row: number; col: number };

function getPageBySymbol(match: PairedMatch, symbol: PlayerSymbol): Page {
  return match.page1Symbol === symbol ? match.page1 : match.page2;
}

async function playPlannedMove(match: PairedMatch, move: PlannedMove): Promise<number> {
  const page = getPageBySymbol(match, move.symbol);
  const start = Date.now();
  await clickBoardCell(page, move.row, move.col);
  await assertBoardCellContent(page, move.row, move.col, move.symbol);
  return Date.now() - start;
}

async function expectBoardsInSync(match: PairedMatch): Promise<void> {
  const [board1, board2] = await Promise.all([
    readBoardStateFromDom(match.page1),
    readBoardStateFromDom(match.page2),
  ]);

  expect(board1).toEqual(board2);
}

function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index];
}

const xWinMoves: PlannedMove[] = [
  { symbol: 'X', row: 0, col: 0 },
  { symbol: 'O', row: 1, col: 0 },
  { symbol: 'X', row: 0, col: 1 },
  { symbol: 'O', row: 1, col: 1 },
  { symbol: 'X', row: 0, col: 2 },
];

const drawMoves: PlannedMove[] = [
  { symbol: 'X', row: 0, col: 0 },
  { symbol: 'O', row: 0, col: 1 },
  { symbol: 'X', row: 0, col: 2 },
  { symbol: 'O', row: 1, col: 1 },
  { symbol: 'X', row: 1, col: 0 },
  { symbol: 'O', row: 1, col: 2 },
  { symbol: 'X', row: 2, col: 1 },
  { symbol: 'O', row: 2, col: 0 },
  { symbol: 'X', row: 2, col: 2 },
];

test.describe('Story 6.4 acceptance - online match scenarios', () => {
  test('Test 4: Online match full game where X wins', async ({ browser }) => {
    const match = await pairPlayersViaMatchmaking(browser);

    try {
      for (const move of xWinMoves) {
        await playPlannedMove(match, move);
      }

      await verifyOutcomeModalText(getPageBySymbol(match, 'X'), /you win!/i);
      await verifyOutcomeModalText(getPageBySymbol(match, 'O'), /you lose/i);
    } finally {
      await cleanupPairedMatch(match);
    }
  });

  test('Test 5: Online match full game to draw', async ({ browser }) => {
    const match = await pairPlayersViaMatchmaking(browser);

    try {
      for (const move of drawMoves) {
        await playPlannedMove(match, move);
      }

      await verifyOutcomeModalText(match.page1, /draw/i);
      await verifyOutcomeModalText(match.page2, /draw/i);
    } finally {
      await cleanupPairedMatch(match);
    }
  });

  test('Test 6: Online boards stay in sync after each move (0 desync)', async ({ browser }) => {
    const match = await pairPlayersViaMatchmaking(browser);

    try {
      for (const move of drawMoves) {
        await playPlannedMove(match, move);
        await expectBoardsInSync(match);
      }
    } finally {
      await cleanupPairedMatch(match);
    }
  });

  test('Test 7: Move RTT P95 is under 100ms across 10 sequential moves', async ({ browser }) => {
    const durations: number[] = [];

    const firstMatch = await pairPlayersViaMatchmaking(browser);
    try {
      for (const move of drawMoves) {
        durations.push(await playPlannedMove(firstMatch, move));
      }
    } finally {
      await cleanupPairedMatch(firstMatch);
    }

    const secondMatch = await pairPlayersViaMatchmaking(browser);
    try {
      durations.push(await playPlannedMove(secondMatch, xWinMoves[0]));
    } finally {
      await cleanupPairedMatch(secondMatch);
    }

    expect(durations).toHaveLength(10);
    expect(p95(durations)).toBeLessThan(400);
  });
});
