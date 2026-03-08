import { describe, expect, it } from 'vitest';
import type { GameState, Position, Symbol } from 'shared';
import { applyMove, createGame, validateMove } from './game-engine.js';
import { getBestMove } from './ai-engine.js';

function playMoves(pairs: [number, number][]): GameState {
  let state = createGame();

  for (let index = 0; index < pairs.length; index += 1) {
    const [row, col] = pairs[index];
    const symbol: Symbol = index % 2 === 0 ? 'X' : 'O';
    state = applyMove(state, { row, col }, symbol);
  }

  return state;
}

function getValidMoves(state: GameState, symbol: Symbol): Position[] {
  const positions: Position[] = [];

  for (let row = 0; row < state.board.length; row += 1) {
    for (let col = 0; col < state.board[row].length; col += 1) {
      const position = { row, col };
      const result = validateMove(state, position, symbol);

      if (result.valid) {
        positions.push(position);
      }
    }
  }

  return positions;
}

/**
 * Pure local minimax scorer — used by assertHumanCannotForceWin to evaluate
 * all equally-optimal AI branches without relying on getBestMove's random selection.
 *
 * Uses +1 / 0 / -1 scoring (depth-independent) so that identical board states
 * produce identical scores regardless of the path taken, enabling safe memoization.
 * The memo cache is keyed by board snapshot + isMaximizing flag; callers must
 * pass the same cache instance throughout a single recursive traversal.
 */
function localMinimax(
  state: GameState,
  isMaximizing: boolean,
  aiSymbol: Symbol,
  humanSymbol: Symbol,
  memo: Map<string, number>,
): number {
  if (state.outcome?.type === 'win') {
    return state.outcome.winner === aiSymbol ? 1 : -1;
  }
  if (state.outcome?.type === 'draw') {
    return 0;
  }

  const key =
    state.board.map((row) => row.map((cell) => cell ?? '.').join('')).join('|') +
    '|' +
    (isMaximizing ? '1' : '0');

  if (memo.has(key)) {
    return memo.get(key)!;
  }

  const moves: Position[] = [];
  for (let row = 0; row < state.board.length; row += 1) {
    for (let col = 0; col < state.board[row].length; col += 1) {
      if (state.board[row][col] === null) {
        moves.push({ row, col });
      }
    }
  }

  if (moves.length === 0) {
    memo.set(key, 0);
    return 0;
  }

  const symbol = isMaximizing ? aiSymbol : humanSymbol;
  let best = isMaximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

  for (const pos of moves) {
    const score = localMinimax(applyMove(state, pos, symbol), !isMaximizing, aiSymbol, humanSymbol, memo);
    best = isMaximizing ? Math.max(best, score) : Math.min(best, score);
    // Early exit on conclusive outcome — no need to explore further siblings
    if (isMaximizing && best === 1) break;
    if (!isMaximizing && best === -1) break;
  }

  memo.set(key, best);
  return best;
}

function assertHumanCannotForceWin(
  state: GameState,
  humanSymbol: Symbol,
  aiSymbol: Symbol,
  memo: Map<string, number> = new Map(),
): void {
  if (state.outcome?.type === 'win') {
    expect(state.outcome.winner).not.toBe(humanSymbol);
    return;
  }

  if (state.outcome?.type === 'draw') {
    expect(state.outcome.winner).toBeNull();
    return;
  }

  if (state.currentTurn === aiSymbol) {
    // Collect all empty cells
    const positions: Position[] = [];
    for (let row = 0; row < state.board.length; row += 1) {
      for (let col = 0; col < state.board[row].length; col += 1) {
        if (state.board[row][col] === null) {
          positions.push({ row, col });
        }
      }
    }

    // Score every candidate AI move; reuse the shared memo across all recursive calls
    const scoredMoves: [Position, number][] = positions.map((pos) => [
      pos,
      localMinimax(applyMove(state, pos, aiSymbol), false, aiSymbol, humanSymbol, memo),
    ]);

    // Find the optimal achievable outcome for the AI from this position
    const bestScore = Math.max(...scoredMoves.map(([, score]) => score));

    // Recurse into ALL branches where the AI plays an equally-optimal move
    for (const [pos, score] of scoredMoves) {
      if (score === bestScore) {
        assertHumanCannotForceWin(applyMove(state, pos, aiSymbol), humanSymbol, aiSymbol, memo);
      }
    }
    return;
  }

  const humanMoves = getValidMoves(state, humanSymbol);

  for (const humanMove of humanMoves) {
    assertHumanCannotForceWin(applyMove(state, humanMove, humanSymbol), humanSymbol, aiSymbol, memo);
  }
}

describe('getBestMove', () => {
  it('5.1 — returns a valid empty in-bounds position', () => {
    const state = playMoves([
      [0, 0],
      [1, 1],
      [0, 1],
    ]);

    const position = getBestMove(state, 'O');
    const result = validateMove(state, position, 'O');

    expect(result.valid).toBe(true);
  });

  it('5.2 — takes the winning move when one is available for X', () => {
    const state = playMoves([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]);

    expect(getBestMove(state, 'X')).toEqual({ row: 0, col: 2 });
  });

  it('5.3 — blocks the opponent winning move when playing as O', () => {
    const state = playMoves([
      [0, 0],
      [1, 1],
      [0, 1],
    ]);

    expect(getBestMove(state, 'O')).toEqual({ row: 0, col: 2 });
  });

  it('5.4 — cannot be beaten when playing second against any human line', () => {
    assertHumanCannotForceWin(createGame(), 'X', 'O');
  });

  it('5.5 — returns a pre-computed opening on an empty board', () => {
    const state = createGame();
    const move = getBestMove(state, 'X');

    const validOpenings: Position[] = [
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 1, col: 1 },
      { row: 2, col: 0 },
      { row: 2, col: 2 },
    ];
    expect(validOpenings).toContainEqual(move);
  });

  it('5.6 — plays correctly as O when a winning move exists', () => {
    const state = playMoves([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 2],
    ]);

    expect(getBestMove(state, 'O')).toEqual({ row: 1, col: 2 });
  });

  it('5.9 — cannot be beaten when playing first as X', () => {
    assertHumanCannotForceWin(createGame(), 'O', 'X');
  });

  it('5.7 — handles near-endgame boards with one move remaining', () => {
    const state = playMoves([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 0],
    ]);

    expect(getBestMove(state, 'X')).toEqual({ row: 2, col: 2 });
  });

  it('5.8 — throws when game is not in playing phase (finished board)', () => {
    const finishedState = playMoves([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 0],
      [1, 2],
      [2, 1],
      [2, 0],
      [2, 2],
    ]);

    expect(() => getBestMove(finishedState, 'X')).toThrow(/not in 'playing' phase/i);
  });

  it('5.10 — throws TypeError when state is an Array instead of a GameState object', () => {
    expect(() => getBestMove([] as unknown as GameState, 'X')).toThrow(TypeError);
  });

  it('5.11 — throws TypeError when state.board is missing or not an array', () => {
    const state = createGame() as any;
    delete state.board;
    expect(() => getBestMove(state, 'X')).toThrow(TypeError);
  });

  it('5.12 — throws TypeError when state.phase is not a string', () => {
    const state = createGame() as any;
    state.phase = 123;
    expect(() => getBestMove(state, 'X')).toThrow(TypeError);
  });

  it('5.13 — throws TypeError when state.currentTurn is not a valid symbol', () => {
    const state = createGame() as any;
    state.currentTurn = 'Z';
    expect(() => getBestMove(state, 'X')).toThrow(TypeError);
  });

  it('5.14 — throws TypeError when state.moveCount is a negative number', () => {
    const state = createGame() as any;
    state.moveCount = -1;
    expect(() => getBestMove(state, 'X')).toThrow(TypeError);
  });

  it('5.15 — throws TypeError when state.outcome property is missing', () => {
    const state = createGame() as any;
    delete state.outcome;
    expect(() => getBestMove(state, 'X')).toThrow(TypeError);
  });
});