import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEV_MODE_LAG_MAX_MS,
  DEV_MODE_LAG_MIN_MS,
  appendDevModeSocketLog,
  getDevModeDiagnosticsState,
  getDevModeLagDelayMs,
  resetDevModeDiagnosticsForTests,
  runWithDevModeLag,
  setDevModeLagDelayMs,
  setDevModeLagEnabled,
} from './dev-mode-diagnostics';

describe('dev-mode-diagnostics service', () => {
  afterEach(() => {
    vi.useRealTimers();
    resetDevModeDiagnosticsForTests();
  });

  it('clamps lag delay to configured min and max bounds', () => {
    setDevModeLagDelayMs(100);
    expect(getDevModeDiagnosticsState().lagDelayMs).toBe(DEV_MODE_LAG_MIN_MS);

    setDevModeLagDelayMs(9999);
    expect(getDevModeDiagnosticsState().lagDelayMs).toBe(DEV_MODE_LAG_MAX_MS);
  });

  it('maintains append-only socket logs with newest entries retained', () => {
    for (let index = 0; index < 205; index += 1) {
      appendDevModeSocketLog('inbound', `event_${index}`);
    }

    const { socketLogs } = getDevModeDiagnosticsState();

    expect(socketLogs).toHaveLength(200);
    expect(socketLogs[0]?.eventName).toBe('event_5');
    expect(socketLogs[socketLogs.length - 1]?.eventName).toBe('event_204');
  });

  it('runs tasks with delay only when lag simulation is enabled', () => {
    vi.useFakeTimers();
    const task = vi.fn();

    runWithDevModeLag(task);
    expect(task).toHaveBeenCalledTimes(1);

    task.mockReset();
    setDevModeLagEnabled(true);
    setDevModeLagDelayMs(500);

    runWithDevModeLag(task);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(task).toHaveBeenCalledTimes(1);
    expect(getDevModeLagDelayMs()).toBe(500);
  });
});
