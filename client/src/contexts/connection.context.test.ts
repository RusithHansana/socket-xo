import { describe, expect, it } from 'vitest';
import {
  connectionReducer,
  getInitialConnectionState,
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

    expect(connecting).toEqual({ status: 'connecting', searching: false });
    expect(connected).toEqual({ status: 'connected', searching: false });
    expect(searching).toEqual({ status: 'connected', searching: true });
    expect(inGame).toEqual({ status: 'in_game', searching: false });
    expect(gameOver).toEqual({ status: 'game_over', searching: false });
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
});