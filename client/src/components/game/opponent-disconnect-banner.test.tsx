// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import styles from './opponent-disconnect-banner.module.css';
import { OpponentDisconnectBanner } from './opponent-disconnect-banner';

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('OpponentDisconnectBanner', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });

    root = undefined;
    container.remove();
    vi.useRealTimers();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
  });

  it('renders waiting message, countdown, pulse indicator and polite live region', () => {
    act(() => {
      root?.render(<OpponentDisconnectBanner gracePeriodMs={30000} />);
    });

    expect(container.textContent).toContain('Opponent disconnected');
    expect(container.textContent).toContain('0:30');
    expect(container.querySelector('[data-testid="disconnect-indicator"]')).not.toBeNull();
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('decrements countdown each second', () => {
    act(() => {
      root?.render(<OpponentDisconnectBanner gracePeriodMs={30000} />);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(container.textContent).toContain('0:29');
  });

  it('applies critical timer style at five seconds or below', () => {
    act(() => {
      root?.render(<OpponentDisconnectBanner gracePeriodMs={5000} />);
    });

    const timer = container.querySelector('[data-testid="disconnect-timer"]');
    expect(timer?.className).toContain(styles.timerCritical);
  });

  it('shows reconnected state and auto-calls onReconnected', () => {
    const onReconnected = vi.fn();

    act(() => {
      root?.render(
        <OpponentDisconnectBanner
          gracePeriodMs={30000}
          reconnected
          onReconnected={onReconnected}
        />,
      );
    });

    expect(container.textContent).toContain('Opponent reconnected');

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onReconnected).toHaveBeenCalledTimes(1);
  });
});
