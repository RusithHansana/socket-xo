import type { GameState, Board, Symbol, Position, GameOutcome, PlayerInfo } from 'shared';
import { BOARD_SIZE } from 'shared';

/** All 8 winning lines on a 3×3 board (3 rows, 3 columns, 2 diagonals). */
const WINNING_LINES: Position[][] = [
  // Rows
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ],
  [
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ],
  [
    { row: 2, col: 0 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ],
  // Columns
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
  ],
  [
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
  ],
  [
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 2, col: 2 },
  ],
  // Diagonals
  [
    { row: 0, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 2 },
  ],
  [
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 2, col: 0 },
  ],
];

/**
 * Creates a fresh game state with an empty board.
 * X always goes first.
 */
export function createGame(roomId = '', players: PlayerInfo[] = []): GameState {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, (): Symbol | null => null),
  );
  return {
    roomId,
    board,
    currentTurn: 'X',
    players,
    phase: 'playing',
    outcome: null,
    moveCount: 0,
  };
}

/** Discriminated union returned by validateMove. */
export type MoveValidationResult =
  | { valid: true }
  | { valid: false; code: string; message: string };

/**
 * Validates a move without applying it.
 * Returns { valid: true } on success or { valid: false, code, message } on failure.
 */
export function validateMove(
  state: GameState,
  position: Position,
  symbol: Symbol,
): MoveValidationResult {
  const { row, col } = position;

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return {
      valid: false,
      code: 'INVALID_POSITION',
      message: `Position coordinates must be integers.`,
    };
  }

  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return {
      valid: false,
      code: 'INVALID_POSITION',
      message: `Position (${row}, ${col}) is out of bounds.`,
    };
  }

  if (state.phase !== 'playing') {
    return { valid: false, code: 'GAME_OVER', message: 'The game has already ended.' };
  }

  if (state.currentTurn !== symbol) {
    return { valid: false, code: 'WRONG_TURN', message: `It is not ${symbol}'s turn.` };
  }

  if (state.board[row][col] !== null) {
    return {
      valid: false,
      code: 'CELL_OCCUPIED',
      message: `Cell (${row}, ${col}) is already occupied.`,
    };
  }

  return { valid: true };
}

/**
 * Applies a validated move and returns a NEW GameState.
 * Caller MUST validate the move first via validateMove().
 * Checks for win/draw and updates phase + outcome accordingly.
 */
export function applyMove(state: GameState, position: Position, symbol: Symbol): GameState {
  const { row, col } = position;

  const newBoard: Board = state.board.map((r, rIdx) =>
    r.map((cell, cIdx) => (rIdx === row && cIdx === col ? symbol : cell)),
  );

  const newMoveCount = state.moveCount + 1;
  const outcome = checkOutcome(newBoard, newMoveCount);

  return {
    ...state,
    board: newBoard,
    moveCount: newMoveCount,
    currentTurn: symbol === 'X' ? 'O' : 'X',
    phase: outcome !== null ? 'finished' : 'playing',
    outcome,
  };
}

/**
 * Checks if the game has ended (win or draw).
 * Returns the GameOutcome if finished, or null if still in progress.
 */
export function checkOutcome(board: Board, moveCount: number): GameOutcome | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const cellA = board[a.row][a.col];
    if (cellA !== null && cellA === board[b.row][b.col] && cellA === board[c.row][c.col]) {
      return { type: 'win', winner: cellA, winningLine: line.map((p) => ({ ...p })) };
    }
  }

  if (moveCount === BOARD_SIZE * BOARD_SIZE) {
    return { type: 'draw', winner: null, winningLine: null };
  }

  return null;
}
