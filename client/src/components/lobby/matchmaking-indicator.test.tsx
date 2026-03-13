// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchmakingIndicator } from './matchmaking-indicator';

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('MatchmakingIndicator', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
    container.remove();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
    vi.restoreAllMocks();
  });

  function renderIndicator(searching: boolean, matched: boolean, onCancel = vi.fn()) {
    root = createRoot(container);

    act(() => {
      root?.render(
        <MatchmakingIndicator searching={searching} matched={matched} onCancel={onCancel} />,
      );
    });

    return { onCancel };
  }

  it('renders searching text with pulsing dots when searching', () => {
    renderIndicator(true, false);

    expect(container.textContent).toContain('Searching for opponent');
    expect(container.querySelectorAll('[data-dot="true"]')).toHaveLength(3);
  });

  it('renders match found state when matched', () => {
    renderIndicator(false, true);

    expect(container.textContent).toContain('Match found!');
  });

  it('calls onCancel when cancel button is clicked', () => {
    const { onCancel } = renderIndicator(true, false);
    const cancelButton = container.querySelector('button');

    expect(cancelButton).not.toBeNull();

    act(() => {
      cancelButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('includes an aria-live polite region for status updates', () => {
    renderIndicator(true, false);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.textContent).toContain('Searching for opponent');
  });
});
