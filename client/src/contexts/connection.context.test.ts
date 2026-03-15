import { describe, expect, it } from 'vitest';
import {
  connectionReducer,
  getInitialConnectionState,
  type ConnectionState,
} from './connection.context';

describe('connectionReducer', () => {
  it('starts in idle with searching disabled', () => {
    expect(getInitialConnectionState()).toEqual({
      status: 'idle',
      searching: false,
    });
  });

  it('follows the expected connection lifecycle', () => {
    const connecting = connectionReducer(getInitialConnectionState(), { type: 'SET_CONNECTING' });
    const connected = connectionReducer(connecting, { type: 'SET_CONNECTED' });
    const searching = connectionReducer(connected, { type: 'SET_SEARCHING' });
    const inGame = connectionReducer(searching, { type: 'SET_IN_GAME' });
    const gameOver = connectionReducer(inGame, { type: 'SET_GAME_OVER' });
    const leftGame = connectionReducer(gameOver, { type: 'LEAVE_GAME' });

    expect(connecting).toEqual({ status: 'connecting', searching: false });
    expect(connected).toEqual({ status: 'connected', searching: false });
    expect(searching).toEqual({ status: 'connected', searching: true });
    expect(inGame).toEqual({ status: 'in_game', searching: false });
    expect(gameOver).toEqual({ status: 'game_over', searching: false });
    expect(leftGame).toEqual({ status: 'connected', searching: false });
  });

  it('allows disconnected to reconnecting transition', () => {
    const initialState: ConnectionState = {
      ...getInitialConnectionState(),
      status: 'disconnected',
    };

    const nextState = connectionReducer(initialState, { type: 'SET_RECONNECTING' });

    expect(nextState.status).toBe('reconnecting');
    expect(nextState.searching).toBe(false);
  });

  it('allows SET_GAME_OVER transition from disconnected status', () => {
    const initialState: ConnectionState = {
      ...getInitialConnectionState(),
      status: 'disconnected',
    };

    const nextState = connectionReducer(initialState, { type: 'SET_GAME_OVER' });

    expect(nextState.status).toBe('game_over');
    expect(nextState.searching).toBe(false);
  });

  it('ignores invalid transitions and can reset to idle', () => {
    const initial = getInitialConnectionState();
    const invalidInGame = connectionReducer(initial, { type: 'SET_IN_GAME' });
    const disconnected = connectionReducer(
      { status: 'connected', searching: true },
      { type: 'SET_DISCONNECTED' },
    );
    const reset = connectionReducer(disconnected, { type: 'RESET' });

    expect(invalidInGame).toBe(initial);
    expect(disconnected).toEqual({ status: 'disconnected', searching: false });
    expect(reset).toEqual({ status: 'idle', searching: false });
  });

  it('clears searching while preserving status', () => {
    const connectedSearching = { status: 'connected', searching: true } as const;

    const cleared = connectionReducer(connectedSearching, { type: 'CLEAR_SEARCHING' });

    expect(cleared).toEqual({ status: 'connected', searching: false });
  });
});