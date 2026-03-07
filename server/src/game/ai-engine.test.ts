import { performance } from 'node:perf_hooks';
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
    for (let col = 0; col < state.board.length; col += 1) {
      const position = { row, col };
      const result = validateMove(state, position, symbol);

      if (result.valid) {
        positions.push(position);
      }
    }
  }

  return positions;
}

function assertHumanCannotForceWin(
  state: GameState,
  humanSymbol: Symbol,
  aiSymbol: Symbol,
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
    const aiMove = getBestMove(state, aiSymbol);
    const validation = validateMove(state, aiMove, aiSymbol);

    expect(validation.valid).toBe(true);

    const nextState = applyMove(state, aiMove, aiSymbol);
    assertHumanCannotForceWin(nextState, humanSymbol, aiSymbol);
    return;
  }

  const humanMoves = getValidMoves(state, humanSymbol);

  for (const humanMove of humanMoves) {
    const nextState = applyMove(state, humanMove, humanSymbol);
    assertHumanCannotForceWin(nextState, humanSymbol, aiSymbol);
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

  it('5.5 — computes the first move on an empty board in under 200ms', () => {
    const state = createGame();
    const start = performance.now();
    const move = getBestMove(state, 'X');
    const elapsed = performance.now() - start;

    expect(move).toEqual({ row: 1, col: 1 });
    expect(elapsed).toBeLessThan(200);
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

  it('5.6 — cannot be beaten when playing first as X', () => {
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

  it('5.8 — throws when no valid moves remain', () => {
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

    expect(() => getBestMove(finishedState, 'X')).toThrow(/no valid moves/i);
  });
});