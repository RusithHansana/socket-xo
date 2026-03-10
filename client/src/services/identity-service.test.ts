// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearIdentityCache,
  generateAvatarUrl,
  generateDisplayName,
  getGuestIdentity,
  getOrCreatePlayerId,
} from './identity-service';

const PLAYER_ID_STORAGE_KEY = 'socket-xo:playerId';
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('identity-service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    clearIdentityCache();
  });

  it('generates a UUID v4 and stores it in localStorage', () => {
    const playerId = getOrCreatePlayerId();

    expect(playerId).toMatch(UUID_V4_PATTERN);
    expect(localStorage.getItem(PLAYER_ID_STORAGE_KEY)).toBe(playerId);
  });

  it('returns the existing playerId from localStorage on subsequent calls', () => {
    const existingPlayerId = '550e8400-e29b-41d4-a716-446655440000';
    localStorage.setItem(PLAYER_ID_STORAGE_KEY, existingPlayerId);
    const randomUuidSpy = vi.spyOn(crypto, 'randomUUID');

    const playerId = getOrCreatePlayerId();

    expect(playerId).toBe(existingPlayerId);
    expect(randomUuidSpy).not.toHaveBeenCalled();
  });

  it('derives a deterministic display name from a playerId', () => {
    const playerId = '550e8400-e29b-41d4-a716-446655440000';

    expect(generateDisplayName(playerId)).toBe('Player-550e');
  });

  it('builds a RoboHash avatar URL from the playerId', () => {
    const playerId = '550e8400-e29b-41d4-a716-446655440000';

    expect(generateAvatarUrl(playerId)).toBe(`https://robohash.org/${playerId}`);
  });

  it('returns a complete guest identity object', () => {
    const playerId = '550e8400-e29b-41d4-a716-446655440000';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(playerId);

    expect(getGuestIdentity()).toEqual({
      playerId,
      displayName: 'Player-550e',
      avatarUrl: `https://robohash.org/${playerId}`,
    });
  });
});