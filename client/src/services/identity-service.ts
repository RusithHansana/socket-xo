import type { GuestIdentity } from 'shared';

const PLAYER_ID_STORAGE_KEY = 'socket-xo:playerId';

export function getOrCreatePlayerId(): string {
  const existingPlayerId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);

  if (existingPlayerId) {
    return existingPlayerId;
  }

  const playerId = crypto.randomUUID();
  localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);

  return playerId;
}

export function generateDisplayName(playerId: string): string {
  return `Player-${playerId.slice(0, 4)}`;
}

export function generateAvatarUrl(playerId: string): string {
  return `https://robohash.org/${playerId}`;
}

export function getGuestIdentity(): GuestIdentity {
  const playerId = getOrCreatePlayerId();

  return {
    playerId,
    displayName: generateDisplayName(playerId),
    avatarUrl: generateAvatarUrl(playerId),
  };
}