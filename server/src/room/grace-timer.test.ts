import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelGraceTimer,
  clearAllGraceTimers,
  hasActiveGraceTimer,
  startGraceTimer,
} from './grace-timer.js';

describe('grace-timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllGraceTimers();
  });

  afterEach(() => {
    clearAllGraceTimers();
    vi.useRealTimers();
  });

  it('3.1.1 — starts a timer and runs the expiry callback after grace period', () => {
    const onExpiry = vi.fn();

    startGraceTimer('player-1', 30_000, onExpiry);

    expect(hasActiveGraceTimer('player-1')).toBe(true);

    vi.advanceTimersByTime(30_000);

    expect(onExpiry).toHaveBeenCalledTimes(1);
    expect(hasActiveGraceTimer('player-1')).toBe(false);
  });

  it('3.1.2 — cancelling an existing timer returns true and prevents expiry callback', () => {
    const onExpiry = vi.fn();

    startGraceTimer('player-1', 30_000, onExpiry);

    expect(cancelGraceTimer('player-1')).toBe(true);
    expect(hasActiveGraceTimer('player-1')).toBe(false);

    vi.advanceTimersByTime(30_000);

    expect(onExpiry).not.toHaveBeenCalled();
  });

  it('3.1.3 — cancelling a missing timer returns false', () => {
    expect(cancelGraceTimer('missing-player')).toBe(false);
  });

  it('3.1.4 — dual player timers are independent', () => {
    const playerOneExpiry = vi.fn();
    const playerTwoExpiry = vi.fn();

    startGraceTimer('player-1', 10_000, playerOneExpiry);
    startGraceTimer('player-2', 20_000, playerTwoExpiry);

    vi.advanceTimersByTime(10_000);
    expect(playerOneExpiry).toHaveBeenCalledTimes(1);
    expect(playerTwoExpiry).not.toHaveBeenCalled();
    expect(hasActiveGraceTimer('player-1')).toBe(false);
    expect(hasActiveGraceTimer('player-2')).toBe(true);

    vi.advanceTimersByTime(10_000);
    expect(playerTwoExpiry).toHaveBeenCalledTimes(1);
    expect(hasActiveGraceTimer('player-2')).toBe(false);
  });

  it('3.1.5 — starting a timer for same player replaces previous timer', () => {
    const firstExpiry = vi.fn();
    const secondExpiry = vi.fn();

    startGraceTimer('player-1', 10_000, firstExpiry);
    startGraceTimer('player-1', 20_000, secondExpiry);

    vi.advanceTimersByTime(10_000);
    expect(firstExpiry).not.toHaveBeenCalled();
    expect(secondExpiry).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(secondExpiry).toHaveBeenCalledTimes(1);
    expect(hasActiveGraceTimer('player-1')).toBe(false);
  });
});
