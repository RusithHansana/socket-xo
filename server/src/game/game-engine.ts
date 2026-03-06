import type { GameState, Board, Symbol, Position, GameOutcome, PlayerInfo } from 'shared';
import { BOARD_SIZE } from 'shared';

/** Memoization cache: avoids re-allocating winning lines on every checkOutcome call. */
const winningLinesCache = new Map<number, Position[][]>();

/**
 * Generate all winning lines (rows, columns, diagonals) for an n×n board.
 * NOTE: Each line spans the full board width (n-cells-in-a-row win condition).
 * Correct for standard Tic-Tac-Toe (3×3) but does not support m-n-k games
 * where the win condition k differs from the board size n.
 * Results are memoized by board size to avoid repeated allocation on every move.
 */
function generateWinningLines(size: number): Position[][] {
  if (winningLinesCache.has(size)) {
    return winningLinesCache.get(size)!;
  }
  const lines: Position[][] = [];
  for (let r = 0; r < size; r++) {
    lines.push(Array.from({ length: size }, (_, c) => ({ row: r, col: c })));
  }
  for (let c = 0; c < size; c++) {
    lines.push(Array.from({ length: size }, (_, r) => ({ row: r, col: c })));
  }
  lines.push(Array.from({ length: size }, (_, i) => ({ row: i, col: i })));
  lines.push(Array.from({ length: size }, (_, i) => ({ row: i, col: size - 1 - i })));
  winningLinesCache.set(size, lines);
  return lines;
}

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
    players: (Array.isArray(players) ? players : []).map((p) => ({ ...p })),
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
  // Guard against invalid state object (defensive runtime validation)
  if (state == null || typeof state !== 'object') {
    return { valid: false, code: 'INVALID_STATE', message: 'Game state must be a valid object.' };
  }
  if (!Array.isArray(state.board)) {
    return {
      valid: false,
      code: 'INVALID_STATE',
      message: 'Game state must have a valid board array.',
    };
  }

  if (!Number.isInteger(state.moveCount) || state.moveCount < 0) {
    return {
      valid: false,
      code: 'INVALID_STATE',
      message: 'Game state moveCount must be a non-negative integer.',
    };
  }

  if (position == null || typeof position !== 'object') {
    return {
      valid: false,
      code: 'INVALID_POSITION',
      message: 'Position must be a valid object.',
    };
  }

  if (symbol !== 'X' && symbol !== 'O') {
    return {
      valid: false,
      code: 'INVALID_SYMBOL',
      message: `Symbol must be 'X' or 'O', got '${String(symbol)}'.`,
    };
  }

  const { row, col } = position;

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return {
      valid: false,
      code: 'INVALID_POSITION',
      message: `Position coordinates must be integers.`,
    };
  }

  const boardSize = state.board.length;
  if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
    return {
      valid: false,
      code: 'INVALID_POSITION',
      message: `Position (${row}, ${col}) is out of bounds.`,
    };
  }

  // Guard against jagged/sparse board rows — prevents process crash when board[row] is not an array
  if (!Array.isArray(state.board[row])) {
    return {
      valid: false,
      code: 'INVALID_POSITION',
      message: `Position (${row}, ${col}) is out of bounds.`,
    };
  }

  // Guard col within the actual row length — handles jagged boards where a row is shorter
  if (col >= state.board[row].length) {
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

  if (!Array.isArray(state?.board)) {
    throw new TypeError('applyMove: state.board must be a valid array');
  }

  const newBoard: Board = state.board.map((r, rIdx) =>
    r.map((cell, cIdx) => (rIdx === row && cIdx === col ? symbol : cell)),
  );

  const newMoveCount = state.moveCount + 1;
  const outcome = checkOutcome(newBoard, newMoveCount);

  // Explicitly enumerate all GameState properties — prevents arbitrary
  // payload properties from persisting into the returned state object.
  return {
    roomId: state.roomId,
    board: newBoard,
    currentTurn: state.currentTurn === 'X' ? 'O' : 'X',
    players: (Array.isArray(state.players) ? state.players : []).map((p) => ({ ...p })),
    phase: outcome !== null ? 'finished' : 'playing',
    outcome,
    moveCount: newMoveCount,
  };
}

/**
 * Checks if the game has ended (win or draw).
 * Returns the GameOutcome if finished, or null if still in progress.
 */
export function checkOutcome(board: Board, moveCount: number): GameOutcome | null {
  if (!Array.isArray(board)) return null;

  const size = board.length;
  // A win requires at least (2*size - 1) moves: size for one player, size-1 for the other.
  if (moveCount < 2 * size - 1) return null;

  for (const line of generateWinningLines(size)) {
    const first = board[line[0].row][line[0].col];
    // Guard against undefined cells — `undefined === undefined` would be a false-positive win
    if ((first === 'X' || first === 'O') && line.every((p) => board[p.row][p.col] === first)) {
      return { type: 'win', winner: first, winningLine: line.map((p) => ({ ...p })) };
    }
  }

  if (moveCount === size * size) {
    return { type: 'draw', winner: null, winningLine: null };
  }

  return null;
}
