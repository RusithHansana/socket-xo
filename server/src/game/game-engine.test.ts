import { describe, it, expect } from 'vitest';
import { createGame, validateMove, applyMove, checkOutcome } from './game-engine.js';
import { BOARD_SIZE } from 'shared';

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

  it('6.12 — does not mutate the original state (board immutability)', () => {
    const original = createGame();
    const snapshot = original.board.map((row) => [...row]);
    applyMove(original, { row: 0, col: 0 }, 'X');
    original.board.forEach((row, r) => row.forEach((cell, c) => expect(cell).toBe(snapshot[r][c])));
    expect(original.currentTurn).toBe('X');
    expect(original.moveCount).toBe(0);
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
});
