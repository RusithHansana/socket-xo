// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import styles from './reconnect-overlay.module.css';
import { ReconnectOverlay } from './reconnect-overlay';

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('ReconnectOverlay', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  function renderOverlay(props: Partial<React.ComponentProps<typeof ReconnectOverlay>> = {}) {
    if (root === undefined) {
      root = createRoot(container);
    }

    act(() => {
      root?.render(
        <ReconnectOverlay
          gracePeriodMs={30000}
          recovered={false}
          {...props}
        />,
      );
    });
  }

  beforeEach(() => {
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
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

  it('renders reconnecting copy and countdown from grace period', () => {
    renderOverlay();

    expect(container.textContent).toContain('Reconnecting…');
    expect(container.textContent).toContain('0:30');
  });

  it('decrements countdown each second and reaches 0', () => {
    renderOverlay({ gracePeriodMs: 2000 });

    expect(container.textContent).toContain('0:02');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.textContent).toContain('0:01');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.textContent).toContain('0:00');
  });

  it('announces reconnecting and captures focus with tab trap', () => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);

    renderOverlay();

    const overlay = container.querySelector('[role="dialog"]') as HTMLElement | null;
    const liveRegion = container.querySelector('[aria-live="assertive"]');

    expect(liveRegion?.textContent).toContain('Connection lost. Reconnecting…');
    expect(document.activeElement).toBe(overlay);

    act(() => {
      overlay?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(overlay);

    outside.remove();
  });

  it('shows critical styling at 5 seconds or less', () => {
    renderOverlay({ gracePeriodMs: 5000 });

    const timer = container.querySelector('[data-testid="reconnect-timer"]');
    expect(timer?.className).toContain(styles.timerCritical);
  });

  it('shows welcome back state and announces recovery', () => {
    const onRecovered = vi.fn();
    renderOverlay({ onRecovered });

    renderOverlay({ recovered: true, onRecovered });

    const liveRegion = container.querySelector('[aria-live="assertive"]');
    expect(container.textContent).toContain('Welcome back!');
    expect(liveRegion?.textContent).toContain('Connection restored');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onRecovered).toHaveBeenCalledTimes(1);
  });
});