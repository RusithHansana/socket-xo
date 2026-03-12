import { describe, expect, it } from 'vitest';
import type { GameState } from 'shared';
import { gameReducer, getInitialGameState } from './game.context';

const baseGameState: GameState = {
  roomId: 'room-123',
  board: [
    ['X', null, null],
    [null, 'O', null],
    [null, null, null],
  ],
  currentTurn: 'X',
  players: [
    {
      playerId: 'player-x',
      displayName: 'Player X',
      avatarUrl: 'https://robohash.org/x',
      symbol: 'X',
      connected: true,
    },
    {
      playerId: 'player-o',
      displayName: 'Player O',
      avatarUrl: 'https://robohash.org/o',
      symbol: 'O',
      connected: true,
    },
  ],
  phase: 'playing',
  outcome: null,
  moveCount: 2,
};

describe('gameReducer', () => {
  it('maps authoritative game state into context state', () => {
    const nextState = gameReducer(getInitialGameState(), {
      type: 'GAME_START',
      payload: baseGameState,
    });

    expect(nextState).toEqual({
      ...baseGameState,
      lastMoveError: null,
    });
  });

  it('stores move rejection payloads without losing game state', () => {
    const startedState = gameReducer(getInitialGameState(), {
      type: 'GAME_START',
      payload: baseGameState,
    });

    const rejectedState = gameReducer(startedState, {
      type: 'MOVE_REJECTED',
      payload: { code: 'CELL_TAKEN', message: 'Cell already occupied' },
    });

    expect(rejectedState.lastMoveError).toEqual({
      code: 'CELL_TAKEN',
      message: 'Cell already occupied',
    });
    expect(rejectedState.roomId).toBe(baseGameState.roomId);
  });

  it('resets state back to the initial empty snapshot', () => {
    const resetState = gameReducer(
      {
        ...getInitialGameState(),
        roomId: 'room-123',
        moveCount: 4,
        lastMoveError: { code: 'INVALID', message: 'Invalid move' },
      },
      { type: 'RESET' },
    );

    expect(resetState).toEqual(getInitialGameState());
  });
});