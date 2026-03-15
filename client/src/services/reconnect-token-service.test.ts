// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearReconnectToken,
  getReconnectToken,
  storeReconnectToken,
} from './reconnect-token-service';

const playerId = 'player-1';

describe('reconnect-token-service', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and retrieves reconnect token by player id key', () => {
    storeReconnectToken(playerId, 'token-abc');

    expect(getReconnectToken(playerId)).toBe('token-abc');
  });

  it('clears a reconnect token', () => {
    storeReconnectToken(playerId, 'token-abc');

    clearReconnectToken(playerId);

    expect(getReconnectToken(playerId)).toBeNull();
  });

  it('returns null when sessionStorage access throws', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(getReconnectToken(playerId)).toBeNull();

    getItemSpy.mockRestore();
  });

  it('does not throw when storage write/remove is blocked', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => storeReconnectToken(playerId, 'token-abc')).not.toThrow();
    expect(() => clearReconnectToken(playerId)).not.toThrow();

    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });
});
