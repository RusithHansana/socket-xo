import type { GuestIdentity } from 'shared';

const PLAYER_ID_STORAGE_KEY = 'socket-xo:playerId';

export function getOrCreatePlayerId(): string {
  try {
    const existingPlayerId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (existingPlayerId) {
      return existingPlayerId;
    }
  } catch {
    // Ignore localStorage access errors (e.g., restricted mode)
  }

  let playerId: string;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    playerId = crypto.randomUUID();
  } else {
    // Fallback for non-secure contexts
    playerId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  try {
    localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
  } catch {
    // Ignore localStorage set errors
  }

  return playerId;
}

export function generateDisplayName(playerId: string): string {
  return `Player-${playerId.slice(0, 4)}`;
}

export function generateAvatarUrl(playerId: string): string {
  return `https://robohash.org/${playerId}`;
}

let cachedIdentity: GuestIdentity | null = null;

export function getGuestIdentity(): GuestIdentity {
  if (cachedIdentity) {
    return cachedIdentity;
  }

  const playerId = getOrCreatePlayerId();

  cachedIdentity = {
    playerId,
    displayName: generateDisplayName(playerId),
    avatarUrl: generateAvatarUrl(playerId),
  };

  return cachedIdentity;
}

export function clearIdentityCache(): void {
  cachedIdentity = null;
}