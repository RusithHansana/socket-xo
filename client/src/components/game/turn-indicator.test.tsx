// @vitest-environment jsdom

import { act } from 'react';
import type { ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import styles from './turn-indicator.module.css';
import { TurnIndicator } from './turn-indicator';

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('TurnIndicator', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  function renderIndicator(
    overrides: Partial<ComponentProps<typeof TurnIndicator>> = {},
  ) {
    const props: ComponentProps<typeof TurnIndicator> = {
      currentTurn: 'X',
      mySymbol: 'X',
      ...overrides,
    };

    if (root === undefined) {
      root = createRoot(container);
    }

    act(() => {
      root?.render(<TurnIndicator {...props} />);
    });

    return props;
  }

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
  });

  it('renders "Your Turn" with the primary styling when it is my turn', () => {
    renderIndicator({ currentTurn: 'X', mySymbol: 'X' });

    const text = container.querySelector('span');

    expect(text?.textContent).toBe('Your Turn');
    expect(text?.className).toContain(styles.yourTurn);
  });

  it('renders "Opponent\'s Turn" with the secondary styling when it is not my turn', () => {
    renderIndicator({ currentTurn: 'O', mySymbol: 'X' });

    const text = container.querySelector('span');

    expect(text?.textContent).toBe("Opponent's Turn");
    expect(text?.className).toContain(styles.opponentTurn);
  });

  it('renders a polite live region for announcing turn changes', () => {
    renderIndicator();

    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('remounts the animated label and reapplies the slide animation class when the turn changes', () => {
    renderIndicator({ currentTurn: 'X', mySymbol: 'X' });

    const previousText = container.querySelector('span');

    renderIndicator({ currentTurn: 'O', mySymbol: 'X' });

    const nextText = container.querySelector('span');

    expect(nextText).not.toBe(previousText);
    expect(nextText?.textContent).toBe("Opponent's Turn");
    expect(nextText?.className).toContain(styles.slideIn);
  });
});