const graceTimers = new Map<string, NodeJS.Timeout>();

export function startGraceTimer(
  playerId: string,
  gracePeriodMs: number,
  onExpiry: () => void,
): void {
  cancelGraceTimer(playerId);

  const timer = setTimeout(() => {
    graceTimers.delete(playerId);
    onExpiry();
  }, gracePeriodMs);

  graceTimers.set(playerId, timer);
}

export function cancelGraceTimer(playerId: string): boolean {
  const timer = graceTimers.get(playerId);

  if (timer === undefined) {
    return false;
  }

  clearTimeout(timer);
  graceTimers.delete(playerId);
  return true;
}

export function hasActiveGraceTimer(playerId: string): boolean {
  return graceTimers.has(playerId);
}

export function clearAllGraceTimers(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearAllGraceTimers is a test-only helper and cannot be used in production.');
  }

  for (const timer of graceTimers.values()) {
    clearTimeout(timer);
  }

  graceTimers.clear();
}
