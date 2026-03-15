const STORAGE_KEY_PREFIX = 'socket-xo:reconnectToken:';

function getStorageKey(playerId: string): string {
  return `${STORAGE_KEY_PREFIX}${playerId}`;
}

export function storeReconnectToken(playerId: string, token: string): void {
  try {
    sessionStorage.setItem(getStorageKey(playerId), token);
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}

export function getReconnectToken(playerId: string): string | null {
  try {
    return sessionStorage.getItem(getStorageKey(playerId));
  } catch {
    return null;
  }
}

export function clearReconnectToken(playerId: string): void {
  try {
    sessionStorage.removeItem(getStorageKey(playerId));
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}
