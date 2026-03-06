import { describe, it, expect } from 'vitest';
import { createGame, validateMove, applyMove, checkOutcome } from './game-engine.js';
import { BOARD_SIZE } from 'shared';
import type { Board, Position, PlayerInfo, Symbol, GameState } from 'shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Play a sequence of (row, col) moves starting from X, alternating each turn. */
function playMoves(pairs: [number, number][]): ReturnType<typeof createGame> {
  let state = createGame();
  for (let i = 0; i < pairs.length; i++) {
    const symbol = i % 2 === 0 ? 'X' : ('O' as const);
    state = applyMove(state, { row: pairs[i][0], col: pairs[i][1] }, symbol);
  }
  return state;
}

// ---------------------------------------------------------------------------
// createGame
// ---------------------------------------------------------------------------

describe('createGame', () => {
  it('6.1 — starts with an empty 3×3 board', () => {
    const state = createGame();
    expect(state.board).toHaveLength(BOARD_SIZE);
    state.board.forEach((row) => {
      expect(row).toHaveLength(BOARD_SIZE);
      row.forEach((cell) => expect(cell).toBeNull());
    });
  });

  it('6.1 — starts with X turn', () => {
    expect(createGame().currentTurn).toBe('X');
  });

  it('6.1 — starts in playing phase', () => {
    expect(createGame().phase).toBe('playing');
  });

  it('6.1 — starts with 0 moves and null outcome', () => {
    const state = createGame();
    expect(state.moveCount).toBe(0);
    expect(state.outcome).toBeNull();
  });

  it('accepts optional roomId and players', () => {
    const state = createGame('room-abc');
    expect(state.roomId).toBe('room-abc');
  });

  it('defaults to empty string roomId and empty players array', () => {
    const state = createGame();
    expect(state.roomId).toBe('');
    expect(state.players).toEqual([]);
  });

  it('[AI-Review] clones the players array — mutating original does not affect state', () => {
    const players: PlayerInfo[] = [
      {
        playerId: 'p1',
        displayName: 'Alice',
        avatarUrl: '',
        symbol: 'X' as const,
        connected: true,
      },
    ];
    const state = createGame('room-1', players);
    players.push({
      playerId: 'p2',
      displayName: 'Bob',
      avatarUrl: '',
      symbol: 'O' as const,
      connected: true,
    });
    expect(state.players).toHaveLength(1);
  });

  it('[AI-Review] deep-clones player objects — mutating a player in original array does not affect state', () => {
    const players = [
      {
        playerId: 'p1',
        displayName: 'Alice',
        avatarUrl: '',
        symbol: 'X' as const,
        connected: true,
      },
    ];
    const state = createGame('room-1', players);
    players[0].displayName = 'Mutated';
    expect(state.players[0].displayName).toBe('Alice');
  });

  it('[AI-Review] treats non-array players argument as empty array without throwing', () => {
    const state = createGame('room', null as unknown as PlayerInfo[]);
    expect(state.players).toEqual([]);
    expect(Array.isArray(state.players)).toBe(true);
  });

  it('[AI-Review] throws TypeError when roomId is not a string', () => {
    expect(() => createGame(123 as unknown as string)).toThrow(TypeError);
  });

  it('[AI-Review] filters out players with a non-string playerId', () => {
    const invalid = [
      { playerId: 99, displayName: 'Alice', avatarUrl: '', symbol: 'X' as const, connected: true },
    ];
    const state = createGame('room', invalid as unknown as PlayerInfo[]);
    expect(state.players).toHaveLength(0);
  });

  it('[AI-Review] filters out players with an invalid symbol value', () => {
    const invalid = [
      {
        playerId: 'p1',
        displayName: 'Alice',
        avatarUrl: '',
        symbol: 'Q' as unknown as Symbol,
        connected: true,
      },
    ];
    const state = createGame('room', invalid as unknown as PlayerInfo[]);
    expect(state.players).toHaveLength(0);
  });

  it('[AI-Review] filters out players with a non-boolean connected field', () => {
    const invalid = [
      {
        playerId: 'p1',
        displayName: 'Alice',
        avatarUrl: '',
        symbol: 'X' as const,
        connected: 'yes',
      },
    ];
    const state = createGame('room', invalid as unknown as PlayerInfo[]);
    expect(state.players).toHaveLength(0);
  });

  it('[AI-Review] retains players where all fields are valid and rejects those that are not', () => {
    const players = [
      {
        playerId: 'p1',
        displayName: 'Alice',
        avatarUrl: '',
        symbol: 'X' as const,
        connected: true,
      },
      { playerId: 42, displayName: 'Bob', avatarUrl: '', symbol: 'O' as const, connected: true },
    ];
    const state = createGame('room', players as unknown as PlayerInfo[]);
    expect(state.players).toHaveLength(1);
    expect(state.players[0].playerId).toBe('p1');
  });
});

// ---------------------------------------------------------------------------
// validateMove
// ---------------------------------------------------------------------------

describe('validateMove', () => {
  it('6.2 — returns valid:true for a legal move', () => {
    const result = validateMove(createGame(), { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(true);
  });

  it('6.3 — rejects occupied cell with CELL_OCCUPIED', () => {
    let state = createGame();
    state = applyMove(state, { row: 0, col: 0 }, 'X'); // board[0][0] = X, turn → O
    const result = validateMove(state, { row: 0, col: 0 }, 'O');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('CELL_OCCUPIED');
  });

  it('6.4 — rejects wrong turn with WRONG_TURN', () => {
    const state = createGame(); // currentTurn = X
    const result = validateMove(state, { row: 1, col: 1 }, 'O');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('WRONG_TURN');
  });

  it('6.5 — rejects move after game over with GAME_OVER', () => {
    // X wins top row: X[0,0] O[1,0] X[0,1] O[1,1] X[0,2]
    const state = playMoves([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ]);
    expect(state.phase).toBe('finished');
    const result = validateMove(state, { row: 2, col: 2 }, 'O');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('GAME_OVER');
  });

  it('6.6 — rejects negative out-of-bounds with INVALID_POSITION', () => {
    const result = validateMove(createGame(), { row: -1, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_POSITION');
  });

  it('6.6 — rejects col >= BOARD_SIZE with INVALID_POSITION', () => {
    const result = validateMove(createGame(), { row: 0, col: BOARD_SIZE }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_POSITION');
  });

  it('6.6 — rejects row >= BOARD_SIZE with INVALID_POSITION', () => {
    const result = validateMove(createGame(), { row: BOARD_SIZE, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_POSITION');
  });

  it('[AI-Review] rejects null position with INVALID_POSITION', () => {
    const result = validateMove(createGame(), null as unknown as Position, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_POSITION');
  });

  it('[AI-Review] rejects undefined position with INVALID_POSITION', () => {
    const result = validateMove(createGame(), undefined as unknown as Position, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_POSITION');
  });

  it('[AI-Review] rejects invalid symbol with INVALID_SYMBOL', () => {
    const result = validateMove(createGame(), { row: 0, col: 0 }, 'Z' as unknown as Symbol);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_SYMBOL');
  });

  it('[AI-Review] rejects null state with INVALID_STATE', () => {
    const result = validateMove(null as unknown as GameState, { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review] rejects undefined state with INVALID_STATE', () => {
    const result = validateMove(undefined as unknown as GameState, { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review] rejects state without board property with INVALID_STATE', () => {
    const result = validateMove({} as unknown as GameState, { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review] handles jagged board (undefined row) without crashing the process', () => {
    const state: GameState = {
      ...createGame(),
      board: [[null, null, null], undefined, [null, null, null]] as unknown as Board,
    };
    // row=1 passes the outer bounds check (row < 3) but board[1] is undefined
    expect(() => validateMove(state, { row: 1, col: 0 }, 'X')).not.toThrow();
    const result = validateMove(state, { row: 1, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_POSITION');
  });

  it('[AI-Review] rejects move when row exists but is shorter than col index (jagged cols)', () => {
    // row 0 has only 1 cell — col=1 is in-bounds for the 3-row board but out-of-bounds for this row
    const state: GameState = {
      ...createGame(),
      board: [[null], [null, null, null], [null, null, null]] as unknown as Board,
    };
    const result = validateMove(state, { row: 0, col: 1 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_POSITION');
  });

  it('[AI-Review] rejects state with non-integer moveCount with INVALID_STATE', () => {
    const state = { ...createGame(), moveCount: 1.5 };
    const result = validateMove(state as unknown as GameState, { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review] rejects state with negative moveCount with INVALID_STATE', () => {
    const state = { ...createGame(), moveCount: -1 };
    const result = validateMove(state as unknown as GameState, { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });
});

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

describe('applyMove', () => {
  it('6.2 — updates the board cell with the player symbol', () => {
    const next = applyMove(createGame(), { row: 1, col: 1 }, 'X');
    expect(next.board[1][1]).toBe('X');
  });

  it('6.2 — switches turn from X to O after a move', () => {
    const next = applyMove(createGame(), { row: 0, col: 0 }, 'X');
    expect(next.currentTurn).toBe('O');
  });

  it('6.2 — switches turn from O back to X', () => {
    let state = applyMove(createGame(), { row: 0, col: 0 }, 'X');
    state = applyMove(state, { row: 1, col: 0 }, 'O');
    expect(state.currentTurn).toBe('X');
  });

  it('6.2 — increments moveCount with each move', () => {
    const s1 = applyMove(createGame(), { row: 0, col: 0 }, 'X');
    expect(s1.moveCount).toBe(1);
    const s2 = applyMove(s1, { row: 1, col: 0 }, 'O');
    expect(s2.moveCount).toBe(2);
  });

  it('[AI-Review] preserves unchanged state properties (roomId, players)', () => {
    const players: PlayerInfo[] = [
      {
        playerId: 'p1',
        displayName: 'Alice',
        avatarUrl: '',
        symbol: 'X' as const,
        connected: true,
      },
      { playerId: 'p2', displayName: 'Bob', avatarUrl: '', symbol: 'O' as const, connected: true },
    ];
    const state = createGame('room-42', players);
    const next = applyMove(state, { row: 0, col: 0 }, 'X');
    expect(next.roomId).toBe('room-42');
    expect(next.players).toStrictEqual(players);
  });

  it('[AI-Review] deep-clones players — mutating returned state players does not affect original', () => {
    const players: PlayerInfo[] = [
      {
        playerId: 'p1',
        displayName: 'Alice',
        avatarUrl: '',
        symbol: 'X' as const,
        connected: true,
      },
    ];
    const state = createGame('room-1', players);
    const next = applyMove(state, { row: 0, col: 0 }, 'X');
    next.players[0].displayName = 'Mutated';
    expect(state.players[0].displayName).toBe('Alice');
  });

  it('6.12 — does not mutate the original state (board immutability)', () => {
    const original = createGame();
    const snapshot = original.board.map((row) => [...row]);
    applyMove(original, { row: 0, col: 0 }, 'X');
    original.board.forEach((row, r) => row.forEach((cell, c) => expect(cell).toBe(snapshot[r][c])));
    expect(original.currentTurn).toBe('X');
    expect(original.moveCount).toBe(0);
  });

  it('[AI-Review] does not crash when state.players is not an array', () => {
    const state = { ...createGame(), players: null };
    expect(() => applyMove(state as unknown as GameState, { row: 0, col: 0 }, 'X')).not.toThrow();
    const next = applyMove(state as unknown as GameState, { row: 0, col: 0 }, 'X');
    expect(Array.isArray(next.players)).toBe(true);
    expect(next.players).toEqual([]);
  });

  it('[AI-Review] throws TypeError when state.board is not an array', () => {
    const state = { ...createGame(), board: null };
    expect(() => applyMove(state as unknown as GameState, { row: 0, col: 0 }, 'X')).toThrow(
      TypeError,
    );
  });

  it('[AI-Review] does not carry arbitrary source-state properties into the returned state', () => {
    const state = { ...createGame(), _internal: 'secret', arbitrary: 42 } as unknown as GameState;
    const next = applyMove(state, { row: 0, col: 0 }, 'X');
    expect((next as unknown as Record<string, unknown>)._internal).toBeUndefined();
    expect((next as unknown as Record<string, unknown>).arbitrary).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// checkOutcome — win detection
// ---------------------------------------------------------------------------

describe('checkOutcome — row wins', () => {
  it('6.7 — detects win on row 0', () => {
    // X[0,0] O[1,0] X[0,1] O[1,1] X[0,2]
    const state = playMoves([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ]);
    expect(state.outcome?.type).toBe('win');
    expect(state.outcome?.winner).toBe('X');
  });

  it('6.7 — detects win on row 1', () => {
    // X[1,0] O[0,0] X[1,1] O[0,1] X[1,2]
    const state = playMoves([
      [1, 0],
      [0, 0],
      [1, 1],
      [0, 1],
      [1, 2],
    ]);
    expect(state.outcome?.type).toBe('win');
    expect(state.outcome?.winner).toBe('X');
  });

  it('6.7 — detects win on row 2', () => {
    // X[2,0] O[0,0] X[2,1] O[0,1] X[2,2]
    const state = playMoves([
      [2, 0],
      [0, 0],
      [2, 1],
      [0, 1],
      [2, 2],
    ]);
    expect(state.outcome?.type).toBe('win');
    expect(state.outcome?.winner).toBe('X');
  });
});

describe('checkOutcome — column wins', () => {
  it('6.8 — detects win on col 0', () => {
    // X[0,0] O[0,1] X[1,0] O[1,1] X[2,0]
    const state = playMoves([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ]);
    expect(state.outcome?.type).toBe('win');
    expect(state.outcome?.winner).toBe('X');
  });

  it('6.8 — detects win on col 1', () => {
    // X[0,1] O[0,0] X[1,1] O[1,0] X[2,1]
    const state = playMoves([
      [0, 1],
      [0, 0],
      [1, 1],
      [1, 0],
      [2, 1],
    ]);
    expect(state.outcome?.type).toBe('win');
    expect(state.outcome?.winner).toBe('X');
  });

  it('6.8 — detects win on col 2', () => {
    // X[0,2] O[0,0] X[1,2] O[1,0] X[2,2]
    const state = playMoves([
      [0, 2],
      [0, 0],
      [1, 2],
      [1, 0],
      [2, 2],
    ]);
    expect(state.outcome?.type).toBe('win');
    expect(state.outcome?.winner).toBe('X');
  });
});

describe('checkOutcome — diagonal wins', () => {
  it('6.9 — detects win on main diagonal (top-left → bottom-right)', () => {
    // X[0,0] O[0,1] X[1,1] O[0,2] X[2,2]
    const state = playMoves([
      [0, 0],
      [0, 1],
      [1, 1],
      [0, 2],
      [2, 2],
    ]);
    expect(state.outcome?.type).toBe('win');
    expect(state.outcome?.winner).toBe('X');
  });

  it('6.9 — detects win on anti-diagonal (top-right → bottom-left)', () => {
    // X[0,2] O[0,0] X[1,1] O[0,1] X[2,0]
    const state = playMoves([
      [0, 2],
      [0, 0],
      [1, 1],
      [0, 1],
      [2, 0],
    ]);
    expect(state.outcome?.type).toBe('win');
    expect(state.outcome?.winner).toBe('X');
  });

  it('6.10 — returns correct winningLine for row 0 win', () => {
    const state = playMoves([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ]);
    expect(state.outcome?.winningLine).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
  });

  it('6.10 — returns correct winningLine for main diagonal win', () => {
    const state = playMoves([
      [0, 0],
      [0, 1],
      [1, 1],
      [0, 2],
      [2, 2],
    ]);
    expect(state.outcome?.winningLine).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ]);
  });

  it('6.10 — returns correct winningLine for anti-diagonal win', () => {
    const state = playMoves([
      [0, 2],
      [0, 0],
      [1, 1],
      [0, 1],
      [2, 0],
    ]);
    expect(state.outcome?.winningLine).toEqual([
      { row: 0, col: 2 },
      { row: 1, col: 1 },
      { row: 2, col: 0 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// checkOutcome — draw
// ---------------------------------------------------------------------------

describe('checkOutcome — win on 9th move', () => {
  it('[AI-Review] detects win when the final (9th) move completes a winning line', () => {
    // Board after all 9 moves (no draw — X wins row 2 on the last move):
    //   O O X
    //   X O O
    //   X X X  ← X completes row 2 on move 9
    const state = playMoves([
      [0, 2], // 1 X
      [0, 0], // 2 O
      [1, 0], // 3 X
      [0, 1], // 4 O
      [2, 0], // 5 X
      [1, 1], // 6 O
      [2, 1], // 7 X
      [1, 2], // 8 O
      [2, 2], // 9 X ← completes row 2
    ]);
    expect(state.moveCount).toBe(9);
    expect(state.phase).toBe('finished');
    expect(state.outcome?.type).toBe('win');
    expect(state.outcome?.winner).toBe('X');
    expect(state.outcome?.winningLine).toEqual([
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ]);
  });
});

describe('checkOutcome — draw', () => {
  it('6.11 — returns draw when board is full with no winner', () => {
    // Board (no winner):
    //   X O X
    //   X X O
    //   O X O
    const state = playMoves([
      [0, 0], // X
      [0, 1], // O
      [0, 2], // X
      [1, 2], // O
      [1, 0], // X
      [2, 0], // O
      [1, 1], // X
      [2, 2], // O
      [2, 1], // X
    ]);
    expect(state.phase).toBe('finished');
    expect(state.outcome?.type).toBe('draw');
    expect(state.outcome?.winner).toBeNull();
    expect(state.outcome?.winningLine).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkOutcome — in progress
// ---------------------------------------------------------------------------

describe('checkOutcome — in progress', () => {
  it('returns null when game has just started', () => {
    const state = createGame();
    expect(checkOutcome(state.board, state.moveCount)).toBeNull();
  });

  it('returns null mid-game before a winner exists', () => {
    const state = playMoves([
      [0, 0],
      [1, 1],
    ]);
    expect(checkOutcome(state.board, state.moveCount)).toBeNull();
  });

  it('[AI-Review] skips win evaluation and returns null when moveCount < 5', () => {
    // Artificially construct a board with a completed row but moveCount = 4
    // (impossible in a real game, but verifies the early-exit guard).
    const board = [
      ['X', 'X', 'X'],
      [null, null, null],
      [null, null, null],
    ] as Board;
    expect(checkOutcome(board, 4)).toBeNull();
  });

  it('[AI-Review] does not produce false-positive win for board with undefined cells', () => {
    // A malformed board where all cells in row 0 are undefined (not null).
    // `undefined === undefined` would be true — the fix guards with (first === 'X' || first === 'O').
    const board = [
      [undefined, undefined, undefined] as unknown as (Symbol | null)[],
      [null, null, null],
      [null, null, null],
    ] as unknown as Board;
    expect(checkOutcome(board, 5)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkOutcome — dynamic board support
// ---------------------------------------------------------------------------

describe('checkOutcome — dynamic board support', () => {
  it('[AI-Review] detects win on a 2×2 board using dynamically generated winning lines', () => {
    // 2×2 board: X X | O null → X wins row 0
    // Old code: WINNING_LINES was for 3×3 — no 2-cell line existed, win not detected.
    // New code: generateWinningLines(2) includes [{0,0},{0,1}] — win detected correctly.
    const board: Board = [
      ['X', 'X'],
      ['O', null],
    ] as unknown as Board;
    const outcome = checkOutcome(board, 3); // moveCount=3 = 2*2-1 (min moves for a 2×2 win)
    expect(outcome?.type).toBe('win');
    expect(outcome?.winner).toBe('X');
  });

  it('[AI-Review] does not return a false-positive draw for a 4×4 board at moveCount===9', () => {
    // Old code: moveCount===BOARD_SIZE*BOARD_SIZE (9) fired a draw for a 4×4 board with only 9 moves.
    // New code: moveCount===board.length*board.length (16) — 9≠16, so null returned correctly.
    const board: Board = [
      ['X', 'O', 'X', 'O'],
      ['O', 'O', 'X', 'O'],
      ['X', null, null, null],
      [null, null, null, null],
    ] as unknown as Board;
    expect(checkOutcome(board, 9)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkOutcome — defensive input validation
// ---------------------------------------------------------------------------

describe('checkOutcome — defensive input validation', () => {
  it('[AI-Review] returns null when board is null (no crash)', () => {
    expect(checkOutcome(null as unknown as Board, 5)).toBeNull();
  });

  it('[AI-Review] returns null when board is undefined (no crash)', () => {
    expect(checkOutcome(undefined as unknown as Board, 5)).toBeNull();
  });

  it('[AI-Review] returns null when board is a non-array value (no crash)', () => {
    expect(checkOutcome('invalid' as unknown as Board, 5)).toBeNull();
  });

  it('[AI-Review][CRITICAL] returns null when a board row is undefined (no crash)', () => {
    // Row 1 is undefined — the guard skips winning-line checks through it without crashing.
    // Row 0 has X O X (not a row win) and col/diagonal lines referencing row 1 are all skipped.
    const board = [['X', 'O', 'X'], undefined, ['O', 'X', null]] as unknown as Board;
    expect(() => checkOutcome(board, 5)).not.toThrow();
    expect(checkOutcome(board, 5)).toBeNull();
  });

  it('[AI-Review][CRITICAL] returns null when a board row is null (no crash)', () => {
    const board = [['X', 'O', 'X'], null, ['O', 'X', null]] as unknown as Board;
    expect(() => checkOutcome(board, 5)).not.toThrow();
    expect(checkOutcome(board, 5)).toBeNull();
  });

  it('[AI-Review][CRITICAL] does not report a win through rows containing only null rows', () => {
    // Only row 0 is valid; rows 1 and 2 are null — no column/diagonal win should fire
    const board = [['X', 'O', 'X'], null, null] as unknown as Board;
    expect(checkOutcome(board, 5)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// applyMove — jagged board rows
// ---------------------------------------------------------------------------

describe('applyMove — jagged board rows', () => {
  it('[AI-Review][CRITICAL] throws TypeError when a row inside state.board is null', () => {
    const state: GameState = {
      ...createGame(),
      board: [[null, null, null], null, [null, null, null]] as unknown as Board,
    };
    expect(() => applyMove(state, { row: 0, col: 0 }, 'X')).toThrow(TypeError);
  });

  it('[AI-Review][CRITICAL] throws TypeError when a row inside state.board is undefined', () => {
    const state: GameState = {
      ...createGame(),
      board: [[null, null, null], undefined, [null, null, null]] as unknown as Board,
    };
    expect(() => applyMove(state, { row: 0, col: 0 }, 'X')).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// validateMove — moveCount vs actual pieces
// ---------------------------------------------------------------------------

describe('validateMove — moveCount vs actual pieces', () => {
  it('[AI-Review][MEDIUM] rejects state where moveCount is higher than actual pieces', () => {
    // Board has 1 piece (X at [0,0]) but moveCount claims 3 — tampered/corrupted state
    applyMove(createGame(), { row: 0, col: 0 }, 'X'); // real board has 1 piece
    const tamperedState: GameState = {
      ...applyMove(createGame(), { row: 0, col: 0 }, 'X'),
      moveCount: 3,
    };
    const result = validateMove(tamperedState, { row: 1, col: 1 }, 'O');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review][MEDIUM] rejects state where moveCount is lower than actual pieces', () => {
    // Board has 2 pieces (X at [0,0], O at [1,0]) but moveCount claims only 1
    const stateWith2Pieces = applyMove(
      applyMove(createGame(), { row: 0, col: 0 }, 'X'),
      { row: 1, col: 0 },
      'O',
    );
    const tamperedState: GameState = { ...stateWith2Pieces, moveCount: 1 };
    const result = validateMove(tamperedState, { row: 0, col: 1 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review][MEDIUM] accepts state where moveCount correctly matches actual pieces', () => {
    // 1 piece on board, moveCount=1, currentTurn=O — should accept O move
    const state = applyMove(createGame(), { row: 0, col: 0 }, 'X');
    expect(state.moveCount).toBe(1);
    const result = validateMove(state, { row: 1, col: 1 }, 'O');
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createGame — roomId length validation
// ---------------------------------------------------------------------------

describe('createGame — roomId validation', () => {
  it('[AI-Review][LOW] truncates roomId longer than 256 characters', () => {
    const longId = 'a'.repeat(300);
    const state = createGame(longId);
    expect(state.roomId.length).toBe(256);
    expect(state.roomId).toBe('a'.repeat(256));
  });

  it('[AI-Review][LOW] preserves roomId within 256 character limit', () => {
    const id = 'room-' + 'x'.repeat(100);
    const state = createGame(id);
    expect(state.roomId).toBe(id);
  });
});

// ---------------------------------------------------------------------------
// winningLinesCache — memory exhaustion cap
// ---------------------------------------------------------------------------

describe('winningLinesCache — memory cap', () => {
  it('[AI-Review][MEDIUM] does not grow the cache beyond MAX_WINNING_LINES_CACHE_SIZE; throws for boards exceeding MAX_BOARD_SIZE', () => {
    // Sizes 2–20: within the allowed range — must not throw and will fill the cache (capped at 20).
    for (let size = 2; size <= 20; size++) {
      const board: Board = Array.from({ length: size }, () =>
        Array.from({ length: size }, (): Symbol | null => null),
      ) as unknown as Board;
      expect(() => checkOutcome(board, 0)).not.toThrow();
    }
    // Sizes > 20: exceeds MAX_BOARD_SIZE — must throw to surface the programming error.
    const oversizedBoard: Board = Array.from({ length: 21 }, () =>
      Array.from({ length: 21 }, (): Symbol | null => null),
    ) as unknown as Board;
    expect(() => checkOutcome(oversizedBoard, 0)).toThrow(Error);
  });
});

// ---------------------------------------------------------------------------
// validateMove — board size cap (DoS / OOM prevention)
// ---------------------------------------------------------------------------

describe('validateMove — board size cap', () => {
  it('[AI-Review][HIGH] rejects state with board.length > MAX_BOARD_SIZE with INVALID_STATE', () => {
    // A 25×25 board (> cap of 20) passed to validateMove must be rejected before
    // generateWinningLines is ever called — preventing OOM from maliciously large input.
    const bigBoard = Array.from({ length: 25 }, () =>
      Array.from({ length: 25 }, (): Symbol | null => null),
    ) as unknown as Board;
    // moveCount=0 matches 0 pieces (passes the piece-count consistency check)
    const state: GameState = { ...createGame(), board: bigBoard, moveCount: 0 };
    const result = validateMove(state, { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review][HIGH] accepts state whose board is exactly MAX_BOARD_SIZE (boundary)', () => {
    const board = Array.from({ length: 20 }, () =>
      Array.from({ length: 20 }, (): Symbol | null => null),
    ) as unknown as Board;
    const state: GameState = { ...createGame(), board, moveCount: 0, currentTurn: 'X' };
    const result = validateMove(state, { row: 0, col: 0 }, 'X');
    // Should not be rejected for board size — other checks may fire, but not INVALID_STATE for size
    if (!result.valid) {
      expect(result.code).not.toBe('INVALID_STATE');
    }
  });
});

// ---------------------------------------------------------------------------
// applyMove — roomId sanitization
// ---------------------------------------------------------------------------

describe('applyMove — roomId sanitization', () => {
  it('[AI-Review][MEDIUM] sanitizes oversized roomId from a tampered input state', () => {
    // createGame caps roomId to 256 chars, but a tampered state could carry a longer string.
    // applyMove must not propagate it into the returned state.
    const longRoomId = 'r'.repeat(300);
    const state: GameState = { ...createGame(), roomId: longRoomId };
    const next = applyMove(state, { row: 0, col: 0 }, 'X');
    expect(next.roomId.length).toBeLessThanOrEqual(256);
    expect(next.roomId).toBe('r'.repeat(256));
  });

  it('[AI-Review][MEDIUM] preserves roomId within the 256-character cap unchanged', () => {
    const state = createGame('room-normal');
    const next = applyMove(state, { row: 0, col: 0 }, 'X');
    expect(next.roomId).toBe('room-normal');
  });
});

// ---------------------------------------------------------------------------
// applyMove — player field sanitization
// ---------------------------------------------------------------------------

describe('applyMove — player field sanitization', () => {
  it('[AI-Review][MEDIUM] strips arbitrary extra properties from player objects in returned state', () => {
    // Inject an extra property directly onto a player in an already-created state.
    // applyMove must enumerate only the known PlayerInfo fields — _extra is never copied.
    const state = createGame('room-1', [
      {
        playerId: 'p1',
        displayName: 'Alice',
        avatarUrl: '',
        symbol: 'X' as const,
        connected: true,
      },
    ]);
    (state.players[0] as unknown as Record<string, unknown>)._extra = 'injected';
    const next = applyMove(state, { row: 0, col: 0 }, 'X');
    expect((next.players[0] as unknown as Record<string, unknown>)._extra).toBeUndefined();
  });

  it('[AI-Review][MEDIUM] retains all legitimate PlayerInfo fields in returned state', () => {
    const players: PlayerInfo[] = [
      {
        playerId: 'p1',
        displayName: 'Alice',
        avatarUrl: 'https://example.com/a.png',
        symbol: 'X',
        connected: true,
      },
    ];
    const state = createGame('room-2', players);
    const next = applyMove(state, { row: 0, col: 0 }, 'X');
    expect(next.players[0]).toEqual({
      playerId: 'p1',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/a.png',
      symbol: 'X',
      connected: true,
    });
  });
});

// ---------------------------------------------------------------------------
// checkOutcome — draw with tampered moveCount
// ---------------------------------------------------------------------------

describe('checkOutcome — draw with tampered moveCount', () => {
  it('[AI-Review][MEDIUM] returns draw when moveCount exceeds size*size (tampered higher)', () => {
    // moveCount=10 (> 9 = 3×3) with a full board and no winner — should still conclude as draw.
    // Old code: === 9 would miss count=10, leaving the game stuck indefinitely.
    // New code: >= 9 correctly catches any over-count.
    const board: Board = [
      ['X', 'O', 'X'],
      ['X', 'X', 'O'],
      ['O', 'X', 'O'],
    ];
    expect(checkOutcome(board, 10)?.type).toBe('draw');
    expect(checkOutcome(board, 10)?.winner).toBeNull();
  });

  it('[AI-Review][MEDIUM] still returns draw at exactly size*size (no regression)', () => {
    const board: Board = [
      ['X', 'O', 'X'],
      ['X', 'X', 'O'],
      ['O', 'X', 'O'],
    ];
    expect(checkOutcome(board, 9)?.type).toBe('draw');
  });
});

// ---------------------------------------------------------------------------
// applyMove — sparse board rows (densification)
// ---------------------------------------------------------------------------

describe('applyMove — sparse board rows', () => {
  it('[AI-Review][LOW] correctly applies move when a board row has a sparse hole (densifies to null)', () => {
    // A sparse array hole (created by `delete arr[i]`) is skipped by `.map()`.
    // Array.from iterates ALL indices, converting the hole to null via `?? null`.
    const sparseRow: (Symbol | null)[] = [null, null, null];
    delete (sparseRow as unknown as Record<number, unknown>)[0]; // hole at index 0
    const state: GameState = {
      ...createGame(),
      board: [sparseRow, [null, null, null], [null, null, null]] as Board,
    };
    const next = applyMove(state, { row: 0, col: 1 }, 'X');
    expect(next.board[0][1]).toBe('X'); // target cell set
    expect(next.board[0][0]).toBeNull(); // sparse hole densified to null
    expect(next.board[0][2]).toBeNull(); // unmodified cell preserved
  });
});

// ---------------------------------------------------------------------------
// applyMove — phase assertion
// ---------------------------------------------------------------------------

describe('applyMove — phase assertion', () => {
  it('[AI-Review][LOW] throws when state.phase is "finished"', () => {
    const state: GameState = { ...createGame(), phase: 'finished' };
    expect(() => applyMove(state, { row: 0, col: 0 }, 'X')).toThrow();
  });

  it('[AI-Review][LOW] throws when state.phase is "waiting"', () => {
    const state: GameState = { ...createGame(), phase: 'waiting' };
    expect(() => applyMove(state, { row: 0, col: 0 }, 'X')).toThrow();
  });

  it('[AI-Review][LOW] does not throw when state.phase is "playing"', () => {
    expect(() => applyMove(createGame(), { row: 0, col: 0 }, 'X')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// applyMove — null/undefined elements in players array
// ---------------------------------------------------------------------------

describe('applyMove — null/undefined player elements', () => {
  it('[AI-Review][CRITICAL] filters out null player elements without crashing', () => {
    const state: GameState = {
      ...createGame(),
      players: [null] as unknown as PlayerInfo[],
    };
    expect(() => applyMove(state, { row: 0, col: 0 }, 'X')).not.toThrow();
    const next = applyMove(state, { row: 0, col: 0 }, 'X');
    expect(Array.isArray(next.players)).toBe(true);
    expect(next.players).toHaveLength(0);
  });

  it('[AI-Review][CRITICAL] filters out undefined player elements without crashing', () => {
    const state: GameState = {
      ...createGame(),
      players: [undefined] as unknown as PlayerInfo[],
    };
    expect(() => applyMove(state, { row: 0, col: 0 }, 'X')).not.toThrow();
    const next = applyMove(state, { row: 0, col: 0 }, 'X');
    expect(Array.isArray(next.players)).toBe(true);
    expect(next.players).toHaveLength(0);
  });

  it('[AI-Review][CRITICAL] keeps valid player elements while filtering null/undefined', () => {
    const validPlayer: PlayerInfo = {
      playerId: 'p1',
      displayName: 'Alice',
      avatarUrl: '',
      symbol: 'X' as const,
      connected: true,
    };
    const state: GameState = {
      ...createGame('room-1', [validPlayer]),
      players: [validPlayer, null, undefined] as unknown as PlayerInfo[],
    };
    const next = applyMove(state, { row: 0, col: 0 }, 'X');
    expect(next.players).toHaveLength(1);
    expect(next.players[0].playerId).toBe('p1');
  });
});

// ---------------------------------------------------------------------------
// validateMove — corrupted board cells
// ---------------------------------------------------------------------------

describe('validateMove — corrupted board cells', () => {
  it('[AI-Review][MEDIUM] rejects board containing an invalid string cell with INVALID_STATE', () => {
    const boardWithInvalidCell: Board = [
      ['invalid-string' as unknown as Symbol | null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    const state: GameState = { ...createGame(), board: boardWithInvalidCell, moveCount: 0 };
    const result = validateMove(state, { row: 1, col: 1 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review][MEDIUM] rejects board containing an object cell with INVALID_STATE', () => {
    const boardWithObjCell: Board = [
      [{} as unknown as Symbol | null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    const state: GameState = { ...createGame(), board: boardWithObjCell, moveCount: 0 };
    const result = validateMove(state, { row: 1, col: 1 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review][MEDIUM] rejects board containing a numeric cell with INVALID_STATE', () => {
    const boardWithNumericCell: Board = [
      [42 as unknown as Symbol | null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    const state: GameState = { ...createGame(), board: boardWithNumericCell, moveCount: 0 };
    const result = validateMove(state, { row: 1, col: 1 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });
});

// ---------------------------------------------------------------------------
// validateMove — currentTurn integrity
// ---------------------------------------------------------------------------

describe('validateMove — currentTurn integrity', () => {
  it('[AI-Review][LOW] rejects state where currentTurn is null with INVALID_STATE', () => {
    const state: GameState = { ...createGame(), currentTurn: null as unknown as Symbol };
    const result = validateMove(state, { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review][LOW] rejects state where currentTurn is an invalid string with INVALID_STATE', () => {
    const state: GameState = { ...createGame(), currentTurn: 'Z' as unknown as Symbol };
    const result = validateMove(state, { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review][LOW] accepts state where currentTurn is "X"', () => {
    const state = createGame(); // currentTurn = 'X'
    const result = validateMove(state, { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(true);
  });

  it('[AI-Review][LOW] accepts state where currentTurn is "O"', () => {
    const state = applyMove(createGame(), { row: 0, col: 0 }, 'X'); // currentTurn = 'O'
    const result = validateMove(state, { row: 1, col: 1 }, 'O');
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyMove — Round 7: null/undefined state guard (CRITICAL)
// ---------------------------------------------------------------------------

describe('applyMove — null/undefined state guard', () => {
  it('[AI-Review][CRITICAL] throws TypeError when state is null', () => {
    expect(() => applyMove(null as unknown as GameState, { row: 0, col: 0 }, 'X')).toThrow(
      TypeError,
    );
  });

  it('[AI-Review][CRITICAL] throws TypeError when state is undefined', () => {
    expect(() => applyMove(undefined as unknown as GameState, { row: 0, col: 0 }, 'X')).toThrow(
      TypeError,
    );
  });
});

// ---------------------------------------------------------------------------
// checkOutcome — Round 7: 0×0 board edge case (CRITICAL)
// ---------------------------------------------------------------------------

describe('checkOutcome — 0×0 board', () => {
  it('[AI-Review][CRITICAL] does not crash when board is an empty array (0×0)', () => {
    expect(() => checkOutcome([] as unknown as Board, 0)).not.toThrow();
  });

  it('[AI-Review][CRITICAL] does not report a win for an empty board', () => {
    // generateWinningLines(0) returns two empty arrays ([], []).
    // The line.length === 0 guard must skip them without accessing line[0].row.
    const result = checkOutcome([] as unknown as Board, 0);
    // An empty board cannot have a winning line — result may be draw or null but not a win.
    expect(result?.type).not.toBe('win');
  });
});

// ---------------------------------------------------------------------------
// validateMove — Round 7: moveCount parity check (HIGH)
// ---------------------------------------------------------------------------

describe('validateMove — moveCount parity check', () => {
  it('[AI-Review][HIGH] rejects state where currentTurn contradicts parity (even pieceCount → O)', () => {
    // 0 pieces on board means even → expected 'X', but currentTurn is 'O'
    const state: GameState = { ...createGame(), currentTurn: 'O', moveCount: 0 };
    const result = validateMove(state, { row: 0, col: 0 }, 'O');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review][HIGH] rejects state where currentTurn contradicts parity (odd pieceCount → X)', () => {
    // After 1 move, pieceCount=1 (odd) → expected 'O', but currentTurn tampered back to 'X'
    const stateAfterOneMove = applyMove(createGame(), { row: 0, col: 0 }, 'X');
    const tamperedState: GameState = { ...stateAfterOneMove, currentTurn: 'X' };
    const result = validateMove(tamperedState, { row: 1, col: 1 }, 'X');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe('INVALID_STATE');
  });

  it('[AI-Review][HIGH] accepts freshly created game (pieceCount=0, currentTurn=X)', () => {
    const result = validateMove(createGame(), { row: 0, col: 0 }, 'X');
    expect(result.valid).toBe(true);
  });

  it('[AI-Review][HIGH] accepts state after one valid move (pieceCount=1, currentTurn=O)', () => {
    const state = applyMove(createGame(), { row: 0, col: 0 }, 'X');
    const result = validateMove(state, { row: 1, col: 1 }, 'O');
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkOutcome — Round 7: board size limit (HIGH, OOM prevention)
// ---------------------------------------------------------------------------

describe('checkOutcome — board size limit', () => {
  it('[AI-Review][HIGH] returns null for a board exceeding MAX_BOARD_SIZE without generating lines', () => {
    // A 25×25 board (> cap of 20) — generateWinningLines must NOT be called (OOM prevention).
    const oversized: Board = Array.from({ length: 25 }, () =>
      Array.from({ length: 25 }, (): Symbol | null => null),
    ) as unknown as Board;
    expect(checkOutcome(oversized, 0)).toBeNull();
  });

  it('[AI-Review][HIGH] processes a board at exactly MAX_BOARD_SIZE without issue', () => {
    // 20×20 board at the boundary — should not be rejected.
    const boundaryBoard: Board = Array.from({ length: 20 }, () =>
      Array.from({ length: 20 }, (): Symbol | null => null),
    ) as unknown as Board;
    // moveCount=0 → early exit (< 2*20-1=39), so null is expected; NO crash is the key check.
    expect(() => checkOutcome(boundaryBoard, 0)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// applyMove — Round 7: non-integer position (MEDIUM)
// ---------------------------------------------------------------------------

describe('applyMove — non-integer position', () => {
  it('[AI-Review][MEDIUM] throws TypeError when position.row is a float', () => {
    expect(() => applyMove(createGame(), { row: 0.5, col: 0 }, 'X')).toThrow(TypeError);
  });

  it('[AI-Review][MEDIUM] throws TypeError when position.col is a float', () => {
    expect(() => applyMove(createGame(), { row: 0, col: 1.7 }, 'X')).toThrow(TypeError);
  });

  it('[AI-Review][MEDIUM] throws TypeError when position.row is NaN', () => {
    expect(() => applyMove(createGame(), { row: NaN, col: 0 }, 'X')).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// applyMove — Round 7: invalid symbol validation (MEDIUM)
// ---------------------------------------------------------------------------

describe('applyMove — symbol validation', () => {
  it('[AI-Review][MEDIUM] throws TypeError when symbol is not X or O', () => {
    expect(() => applyMove(createGame(), { row: 0, col: 0 }, 'Z' as unknown as Symbol)).toThrow(
      TypeError,
    );
  });

  it('[AI-Review][MEDIUM] throws TypeError when symbol is an empty string', () => {
    expect(() => applyMove(createGame(), { row: 0, col: 0 }, '' as unknown as Symbol)).toThrow(
      TypeError,
    );
  });

  it('[AI-Review][MEDIUM] does not throw for valid symbol X', () => {
    expect(() => applyMove(createGame(), { row: 0, col: 0 }, 'X')).not.toThrow();
  });

  it('[AI-Review][MEDIUM] does not throw for valid symbol O', () => {
    const state = applyMove(createGame(), { row: 0, col: 0 }, 'X');
    expect(() => applyMove(state, { row: 1, col: 0 }, 'O')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createGame — Round 7: player filter rejects array elements (LOW)
// ---------------------------------------------------------------------------

describe('createGame — player filter rejects array elements', () => {
  it('[AI-Review][LOW] filters out a bare array element from the players list', () => {
    // typeof [] === 'object' — without !Array.isArray(p), an array would pass the filter.
    const players = [
      [] as unknown as PlayerInfo,
      {
        playerId: 'p1',
        displayName: 'Alice',
        avatarUrl: '',
        symbol: 'X' as const,
        connected: true,
      },
    ];
    const state = createGame('room', players);
    expect(state.players).toHaveLength(1);
    expect(state.players[0].playerId).toBe('p1');
  });

  it('[AI-Review][LOW] produces empty players array when all elements are bare arrays', () => {
    const state = createGame('room', [[] as unknown as PlayerInfo]);
    expect(state.players).toHaveLength(0);
  });
});
