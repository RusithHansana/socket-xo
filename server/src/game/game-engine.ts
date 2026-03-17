import type { GameState, Board, Symbol, Position, GameOutcome, PlayerInfo } from 'shared';
import { BOARD_SIZE } from 'shared';

/** Memoization cache: avoids re-allocating winning lines on every checkOutcome call. */
const winningLinesCache = new Map<number, Position[][]>();
/** Upper bound on cached board sizes — prevents unbounded memory growth from arbitrary input. */
const MAX_WINNING_LINES_CACHE_SIZE = 20;
/** Maximum board size accepted by validateMove — prevents OOM in generateWinningLines from untrusted input. */
const MAX_BOARD_SIZE = 20;

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
  if (winningLinesCache.size < MAX_WINNING_LINES_CACHE_SIZE) {
    winningLinesCache.set(size, lines);
  }
  return lines;
}

/** Maximum allowed length for roomId to prevent storing arbitrarily large strings. */
const MAX_ROOM_ID_LENGTH = 256;

/**
 * Creates a fresh game state with an empty board.
 * X always goes first.
 */
export function createGame(roomId = '', players: PlayerInfo[] = []): GameState {
  if (typeof roomId !== 'string') {
    throw new TypeError(`createGame: roomId must be a string, got ${typeof roomId}.`);
  }
  const safeRoomId = roomId.slice(0, MAX_ROOM_ID_LENGTH);
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, (): Symbol | null => null),
  );
  const currentPlayers = (Array.isArray(players) ? players : [])
    .filter(
      (p): p is PlayerInfo =>
        p != null &&
        typeof p === 'object' &&
        !Array.isArray(p) &&
        typeof p.playerId === 'string' &&
        typeof p.displayName === 'string' &&
        typeof p.avatarUrl === 'string' &&
        (p.symbol === 'X' || p.symbol === 'O') &&
        typeof p.connected === 'boolean',
    )
    .map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      symbol: p.symbol,
      connected: p.connected,
    }));
  return {
    roomId: safeRoomId,
    board,
    currentTurn: 'X',
    players: currentPlayers,
    phase: 'playing',
    outcome: null,
    moveCount: 0,
    chatMessages: [],
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

  // Reject boards exceeding MAX_BOARD_SIZE — prevents OOM in generateWinningLines from untrusted input
  if (state.board.length > MAX_BOARD_SIZE) {
    return {
      valid: false,
      code: 'INVALID_STATE',
      message: `Board size must not exceed ${MAX_BOARD_SIZE}.`,
    };
  }

  if (!Number.isInteger(state.moveCount) || state.moveCount < 0) {
    return {
      valid: false,
      code: 'INVALID_STATE',
      message: 'Game state moveCount must be a non-negative integer.',
    };
  }

  // Verify moveCount matches actual number of pieces placed on the board.
  // Detects corrupted or tampered state where the counter is out of sync.
  // Also rejects any cell value that is not 'X', 'O', or null (corrupted board).
  let actualPieceCount = 0;
  for (const boardRow of state.board) {
    if (Array.isArray(boardRow)) {
      for (const cell of boardRow) {
        if (cell === 'X' || cell === 'O') {
          actualPieceCount++;
        } else if (cell !== null) {
          return {
            valid: false,
            code: 'INVALID_STATE',
            message: 'Board contains an invalid cell value.',
          };
        }
      }
    }
  }
  if (state.moveCount !== actualPieceCount) {
    return {
      valid: false,
      code: 'INVALID_STATE',
      message: `moveCount (${state.moveCount}) does not match actual pieces on the board (${actualPieceCount}).`,
    };
  }

  // Validate currentTurn is a legitimate symbol before any turn comparison.
  if (state.currentTurn !== 'X' && state.currentTurn !== 'O') {
    return {
      valid: false,
      code: 'INVALID_STATE',
      message: `currentTurn must be 'X' or 'O', got '${String(state.currentTurn)}'.`,
    };
  }

  // moveCount parity: X plays on even move indices (0, 2, 4…), O on odd (1, 3, 5…)
  const expectedTurn = actualPieceCount % 2 === 0 ? 'X' : 'O';
  if (state.currentTurn !== expectedTurn) {
    return {
      valid: false,
      code: 'INVALID_STATE',
      message: `currentTurn is inconsistent with moveCount parity: expected '${expectedTurn}' for pieceCount ${actualPieceCount}, got '${state.currentTurn}'.`,
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
  if (state == null || typeof state !== 'object') {
    throw new TypeError('applyMove: state must be a valid object.');
  }

  if (position == null || typeof position !== 'object') {
    throw new TypeError('applyMove: position must be a valid object.');
  }

  const { row, col } = position;

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    throw new TypeError('applyMove: position.row and position.col must be integers.');
  }

  if (symbol !== 'X' && symbol !== 'O') {
    throw new TypeError(`applyMove: symbol must be 'X' or 'O', got '${String(symbol)}'.`);
  }

  if (!Array.isArray(state.board)) {
    throw new TypeError('applyMove: state.board must be a valid array');
  }

  if (state.phase !== 'playing') {
    throw new Error(
      `applyMove: Cannot apply a move — game is not in "playing" phase (current: "${state.phase}").`,
    );
  }

  const newBoard: Board = state.board.map((r, rIdx) => {
    if (!Array.isArray(r)) {
      throw new TypeError(`applyMove: state.board[${rIdx}] must be a valid array`);
    }
    return Array.from({ length: r.length }, (_, cIdx) =>
      rIdx === row && cIdx === col ? symbol : (r[cIdx] ?? null),
    ) as (Symbol | null)[];
  });

  const newMoveCount = state.moveCount + 1;
  const outcome = checkOutcome(newBoard, newMoveCount);
  const players = (Array.isArray(state.players) ? state.players : [])
    .filter(
      (p): p is PlayerInfo =>
        p != null &&
        typeof p === 'object' &&
        !Array.isArray(p) &&
        typeof p.playerId === 'string' &&
        typeof p.displayName === 'string' &&
        typeof p.avatarUrl === 'string' &&
        (p.symbol === 'X' || p.symbol === 'O') &&
        typeof p.connected === 'boolean',
    )
    .map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      symbol: p.symbol,
      connected: p.connected,
    }));

  // Explicitly enumerate all GameState properties — prevents arbitrary
  // payload properties from persisting into the returned state object.
  return {
    roomId: typeof state.roomId === 'string' ? state.roomId.slice(0, MAX_ROOM_ID_LENGTH) : '',
    board: newBoard,
    currentTurn: state.currentTurn === 'X' ? 'O' : 'X',
    players: players,
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
  // Reject oversized boards — prevents OOM in generateWinningLines from untrusted input.
  if (size > MAX_BOARD_SIZE) {
    throw new Error(`checkOutcome: board size ${size} exceeds maximum allowed size ${MAX_BOARD_SIZE}.`);
  }
  // A win requires at least (2*size - 1) moves: size for one player, size-1 for the other.
  if (moveCount < 2 * size - 1) return null;

  for (const line of generateWinningLines(size)) {
    // Skip degenerate lines (e.g. 0×0 board — generateWinningLines(0) returns two empty arrays)
    if (line.length === 0) continue;
    // Guard against undefined/null rows — accessing [col] on a non-array would throw
    if (!Array.isArray(board[line[0].row])) continue;
    const first = board[line[0].row][line[0].col];
    // Guard against undefined cells — `undefined === undefined` would be a false-positive win
    if (
      (first === 'X' || first === 'O') &&
      line.every((p) => Array.isArray(board[p.row]) && board[p.row][p.col] === first)
    ) {
      return { type: 'win', winner: first, winningLine: line.map((p) => ({ ...p })) };
    }
  }

  if (moveCount >= size * size) {
    return { type: 'draw', winner: null, winningLine: null };
  }

  return null;
}
