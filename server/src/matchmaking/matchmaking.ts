const queue: string[] = [];

export function addToQueue(playerId: string): boolean {
  if (queue.includes(playerId)) {
    return false;
  }

  queue.push(playerId);
  return true;
}

export function removeFromQueue(playerId: string): boolean {
  const playerIndex = queue.indexOf(playerId);

  if (playerIndex === -1) {
    return false;
  }

  queue.splice(playerIndex, 1);
  return true;
}

export function isInQueue(playerId: string): boolean {
  return queue.includes(playerId);
}

export function getQueueSize(): number {
  return queue.length;
}

export function tryMatchPair(): [string, string] | null {
  if (queue.length < 2) {
    return null;
  }

  const [player1Id, player2Id] = queue.splice(0, 2);
  return [player1Id, player2Id];
}

export function clearQueue(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearQueue is a test-only helper and cannot be used in production.');
  }

  queue.length = 0;
}