import { expect, test, type Page } from '@playwright/test';
import {
  assertGameOutcomeModalContent,
  assertBoardCellContent,
  clickBoardCell,
  clickPlayAI,
  navigateToLobby,
  returnToLobbyFromOutcomeModal,
} from './helpers/game-actions';
import { readBoardStateFromDom, type BoardGrid } from './helpers/assertions';

type SymbolOrEmpty = 'X' | 'O' | 'empty';
type Move = { row: number; col: number };

function getWinner(board: BoardGrid): 'X' | 'O' | 'draw' | null {
  const lines: SymbolOrEmpty[][] = [];

  for (let i = 0; i < 3; i += 1) {
    lines.push([board[i][0], board[i][1], board[i][2]]);
    lines.push([board[0][i], board[1][i], board[2][i]]);
  }

  lines.push([board[0][0], board[1][1], board[2][2]]);
  lines.push([board[0][2], board[1][1], board[2][0]]);

  for (const line of lines) {
    if (line[0] !== 'empty' && line[0] === line[1] && line[1] === line[2]) {
      return line[0];
    }
  }

  const hasEmpty = board.some((row) => row.includes('empty'));
  return hasEmpty ? null : 'draw';
}

function availableMoves(board: BoardGrid): Move[] {
  const moves: Move[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      if (board[row][col] === 'empty') {
        moves.push({ row, col });
      }
    }
  }

  return moves;
}

function applyMove(board: BoardGrid, move: Move, symbol: 'X' | 'O'): BoardGrid {
  const next = board.map((row) => [...row]) as BoardGrid;
  next[move.row][move.col] = symbol;
  return next;
}

function minimax(board: BoardGrid, turn: 'X' | 'O'): number {
  const winner = getWinner(board);
  if (winner === 'X') {
    return 1;
  }
  if (winner === 'O') {
    return -1;
  }
  if (winner === 'draw') {
    return 0;
  }

  const moves = availableMoves(board);
  if (turn === 'X') {
    let best = Number.NEGATIVE_INFINITY;
    for (const move of moves) {
      best = Math.max(best, minimax(applyMove(board, move, 'X'), 'O'));
    }
    return best;
  }

  let best = Number.POSITIVE_INFINITY;
  for (const move of moves) {
    best = Math.min(best, minimax(applyMove(board, move, 'O'), 'X'));
  }
  return best;
}

function chooseBestMoveForX(board: BoardGrid): Move {
  const moves = availableMoves(board);
  let bestMove = moves[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of moves) {
    const score = minimax(applyMove(board, move, 'X'), 'O');
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function chooseWorstMoveForX(board: BoardGrid): Move {
  const moves = availableMoves(board);
  let worstMove = moves[0];
  let worstScore = Number.POSITIVE_INFINITY;

  for (const move of moves) {
    const score = minimax(applyMove(board, move, 'X'), 'O');
    if (score < worstScore) {
      worstScore = score;
      worstMove = move;
    }
  }

  return worstMove;
}

async function playUntilOutcome(page: Page, pickMove: (board: BoardGrid) => Move): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) {
    if (await page.getByRole('dialog').isVisible().catch(() => false)) {
      return;
    }

    const board = await readBoardStateFromDom(page);
    const move = pickMove(board);

    await clickBoardCell(page, move.row, move.col);
    await assertBoardCellContent(page, move.row, move.col, 'X');

    await expect
      .poll(async () => {
        if (await page.getByRole('dialog').isVisible().catch(() => false)) {
          return true;
        }

        const text = (await page.getByText(/your turn|opponent's turn/i).first().textContent())?.trim() ?? '';
        return /your turn/i.test(text);
      })
      .toBe(true);
  }
}

test.describe('Story 6.4 acceptance - AI solo scenarios', () => {
  test('Test 1: AI solo - deliberately lose against unbeatable AI', async ({ page }) => {
    await navigateToLobby(page);
    await clickPlayAI(page);

    await playUntilOutcome(page, chooseWorstMoveForX);
    await assertGameOutcomeModalContent(page, /you lose/i);
  });

  test('Test 2: AI solo - optimal human play results in draw', async ({ page }) => {
    await navigateToLobby(page);
    await clickPlayAI(page);

    await playUntilOutcome(page, chooseBestMoveForX);
    await assertGameOutcomeModalContent(page, /^draw$/i);
  });

  test('Test 3: AI solo - outcome modal and Back to Lobby navigation', async ({ page }) => {
    await navigateToLobby(page);
    await clickPlayAI(page);

    await playUntilOutcome(page, chooseWorstMoveForX);
    await expect(page.getByRole('dialog')).toBeVisible();

    await returnToLobbyFromOutcomeModal(page);
  });
});
