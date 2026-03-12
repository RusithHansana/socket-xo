import { beforeEach, describe, expect, it } from 'vitest';
import {
  addToQueue,
  clearQueue,
  getQueueSize,
  isInQueue,
  removeFromQueue,
  tryMatchPair,
} from './matchmaking.js';

describe('matchmaking', () => {
  beforeEach(() => {
    clearQueue();
  });

  it('2.3.4.2 — addToQueue adds a player and returns true', () => {
    expect(addToQueue('player-1')).toBe(true);
    expect(getQueueSize()).toBe(1);
    expect(isInQueue('player-1')).toBe(true);
  });

  it('2.3.4.3 — addToQueue rejects duplicates and leaves queue unchanged', () => {
    addToQueue('player-1');

    expect(addToQueue('player-1')).toBe(false);
    expect(getQueueSize()).toBe(1);
  });

  it('2.3.4.3.1 — addToQueue places player at the front when toFront is true', () => {
    addToQueue('player-1');
    addToQueue('player-2', true);

    expect(tryMatchPair()).toEqual(['player-2', 'player-1']);
  });

  it('2.3.4.4 — removeFromQueue removes an existing player', () => {
    addToQueue('player-1');

    expect(removeFromQueue('player-1')).toBe(true);
    expect(getQueueSize()).toBe(0);
    expect(isInQueue('player-1')).toBe(false);
  });

  it('2.3.4.5 — removeFromQueue returns false for a missing player', () => {
    expect(removeFromQueue('missing-player')).toBe(false);
  });

  it('2.3.4.6 — isInQueue reports membership accurately', () => {
    addToQueue('player-1');

    expect(isInQueue('player-1')).toBe(true);
    expect(isInQueue('player-2')).toBe(false);
  });

  it('2.3.4.7 — getQueueSize reports the current queue length', () => {
    addToQueue('player-1');
    addToQueue('player-2');
    addToQueue('player-3');

    expect(getQueueSize()).toBe(3);
  });

  it('2.3.4.8 — tryMatchPair returns the first two players in FIFO order', () => {
    addToQueue('player-1');
    addToQueue('player-2');
    addToQueue('player-3');

    expect(tryMatchPair()).toEqual(['player-1', 'player-2']);
  });

  it('2.3.4.9 — tryMatchPair returns null when fewer than two players are queued', () => {
    expect(tryMatchPair()).toBeNull();

    addToQueue('player-1');

    expect(tryMatchPair()).toBeNull();
  });

  it('2.3.4.10 — tryMatchPair removes the paired players from the queue', () => {
    addToQueue('player-1');
    addToQueue('player-2');
    addToQueue('player-3');

    tryMatchPair();

    expect(getQueueSize()).toBe(1);
    expect(isInQueue('player-1')).toBe(false);
    expect(isInQueue('player-2')).toBe(false);
    expect(isInQueue('player-3')).toBe(true);
  });

  it('2.3.4.11 — queue supports add, remove, and re-add sequences', () => {
    addToQueue('player-1');
    removeFromQueue('player-1');

    expect(addToQueue('player-1')).toBe(true);
    expect(getQueueSize()).toBe(1);
    expect(isInQueue('player-1')).toBe(true);
  });

  it('2.3.4.12 — clearQueue empties the queue in test environments', () => {
    addToQueue('player-1');
    addToQueue('player-2');

    clearQueue();

    expect(getQueueSize()).toBe(0);
  });
});