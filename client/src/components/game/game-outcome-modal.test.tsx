// @vitest-environment jsdom

import { act } from 'react';
import type { ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameOutcome } from 'shared';
import styles from './game-outcome-modal.module.css';
import { GameOutcomeModal } from './game-outcome-modal';

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('GameOutcomeModal', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  function renderModal(overrides: Partial<ComponentProps<typeof GameOutcomeModal>> = {}) {
    const props: ComponentProps<typeof GameOutcomeModal> = {
      outcome: {
        type: 'win',
        winner: 'X',
        winningLine: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
      } satisfies GameOutcome,
      mySymbol: 'X',
      onBackToLobby: vi.fn(),
      ...overrides,
    };

    if (root === undefined) {
      root = createRoot(container);
    }

    act(() => {
      root?.render(<GameOutcomeModal {...props} />);
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
    vi.restoreAllMocks();
  });

  it('7.8 — renders "You Win!" with success color for a win outcome', () => {
    renderModal();

    const heading = container.querySelector('h2');

    expect(heading?.textContent).toBe('You Win!');
    expect(heading?.className).toContain(styles.win);
  });

  it('7.9 — renders "Draw" for a draw outcome', () => {
    renderModal({
      outcome: { type: 'draw', winner: null, winningLine: null },
    });

    const heading = container.querySelector('h2');

    expect(heading?.textContent).toBe('Draw');
    expect(heading?.className).toContain(styles.draw);
  });

  it('7.10 — renders "You Lose" for a loss outcome', () => {
    renderModal({
      outcome: {
        type: 'win',
        winner: 'O',
        winningLine: [
          { row: 0, col: 0 },
          { row: 1, col: 1 },
          { row: 2, col: 2 },
        ],
      },
    });

    const heading = container.querySelector('h2');

    expect(heading?.textContent).toBe('You Lose');
    expect(heading?.className).toContain(styles.loss);
  });

  it('renders forfeit win copy when my symbol is winner', () => {
    renderModal({
      outcome: {
        type: 'forfeit',
        winner: 'X',
        winningLine: null,
      },
      mySymbol: 'X',
      opponentName: 'Player Two',
    });

    const heading = container.querySelector('h2');
    const detail = container.querySelector('p:not([class*="kicker"])');

    expect(heading?.textContent).toBe('You Win!');
    expect(detail?.textContent).toContain('forfeited the match');
    expect(heading?.className).toContain(styles.win);
  });

  it('renders forfeit loss copy when my symbol is not winner', () => {
    renderModal({
      outcome: {
        type: 'forfeit',
        winner: 'O',
        winningLine: null,
      },
      mySymbol: 'X',
    });

    const heading = container.querySelector('h2');
    const detail = container.querySelector('p:not([class*="kicker"])');

    expect(heading?.textContent).toBe('You Lose');
    expect(detail?.textContent).toContain('grace period expired');
    expect(heading?.className).toContain(styles.loss);
  });

  it('7.11 — clicking Back to Lobby calls onBackToLobby', () => {
    const props = renderModal();
    const button = container.querySelector('button');

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onBackToLobby).toHaveBeenCalledTimes(1);
  });

  it('7.12 — has role dialog and aria-modal true', () => {
    renderModal();

    const dialog = container.querySelector('[role="dialog"]');

    expect(dialog?.getAttribute('aria-modal')).toBe('true');
  });

  it('7.13 — has an assertive live region with the outcome text', () => {
    renderModal();

    const liveRegion = container.querySelector('[aria-live="assertive"]');

    expect(liveRegion?.textContent).toBe('You Win!');
  });

  it('7.14 — focuses the Back to Lobby button after mount', () => {
    renderModal();

    const button = container.querySelector('button');

    expect(document.activeElement).toBe(button);
  });

  it('7.15 — uses custom opponentName in the detail text', () => {
    renderModal({
      opponentName: 'John Doe',
    });

    const detail = container.querySelector('p:not([class*="kicker"])');
    expect(detail?.textContent).toContain('John Doe');
  });

  it('7.16 — capitalizes "the AI" at the start of sentence in loss outcome', () => {
    renderModal({
      outcome: {
        type: 'win',
        winner: 'O',
        winningLine: [
          { row: 0, col: 0 },
          { row: 1, col: 1 },
          { row: 2, col: 2 },
        ],
      },
      opponentName: 'the AI',
    });

    const detail = container.querySelector('p:not([class*="kicker"])');
    expect(detail?.textContent).toMatch(/^The AI/);
  });
});