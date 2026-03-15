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
      opponentDisconnect: null,
      reconnectError: null,
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

  it('stores opponent disconnect payload and clears it on reconnect', () => {
    const disconnectedState = gameReducer(getInitialGameState(), {
      type: 'OPPONENT_DISCONNECTED',
      payload: { playerId: 'player-o', gracePeriodMs: 30000 },
    });

    expect(disconnectedState.opponentDisconnect).toEqual({
      playerId: 'player-o',
      gracePeriodMs: 30000,
    });

    const reconnectedState = gameReducer(disconnectedState, {
      type: 'OPPONENT_RECONNECTED',
    });

    expect(reconnectedState.opponentDisconnect).toBeNull();
  });

  it('clears opponent disconnect state when game over snapshot arrives', () => {
    const disconnectedState = gameReducer(getInitialGameState(), {
      type: 'OPPONENT_DISCONNECTED',
      payload: { playerId: 'player-o', gracePeriodMs: 30000 },
    });

    const gameOverState = gameReducer(disconnectedState, {
      type: 'GAME_OVER',
      payload: {
        ...baseGameState,
        phase: 'finished',
        outcome: { type: 'draw', winner: null, winningLine: null },
      },
    });

    expect(gameOverState.opponentDisconnect).toBeNull();
  });

  it('resets state back to the initial empty snapshot', () => {
    const resetState = gameReducer(
      {
        ...getInitialGameState(),
        roomId: 'room-123',
        moveCount: 4,
        lastMoveError: { code: 'INVALID', message: 'Invalid move' },
        opponentDisconnect: {
          playerId: 'player-o',
          gracePeriodMs: 30000,
        },
        reconnectError: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session missing',
        },
      },
      { type: 'RESET' },
    );

    expect(resetState).toEqual(getInitialGameState());
  });

  it('stores reconnect failure error for overlay state', () => {
    const nextState = gameReducer(getInitialGameState(), {
      type: 'RECONNECT_FAILED',
      payload: {
        code: 'GAME_ENDED',
        message: 'Game ended during disconnect',
      },
    });

    expect(nextState.reconnectError).toEqual({
      code: 'GAME_ENDED',
      message: 'Game ended during disconnect',
    });
  });

  it('resets game snapshot for invalid token reconnect failures while keeping error', () => {
    const startedState = gameReducer(getInitialGameState(), {
      type: 'GAME_START',
      payload: baseGameState,
    });

    const nextState = gameReducer(startedState, {
      type: 'RECONNECT_FAILED',
      payload: {
        code: 'SESSION_NOT_FOUND',
        message: 'Session no longer exists',
      },
    });

    expect(nextState.roomId).toBeNull();
    expect(nextState.phase).toBe('waiting');
    expect(nextState.reconnectError).toEqual({
      code: 'SESSION_NOT_FOUND',
      message: 'Session no longer exists',
    });
  });
});