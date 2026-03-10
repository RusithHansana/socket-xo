// @vitest-environment jsdom

import { act } from 'react';
import type { ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Board, GameOutcome } from 'shared';
import cellStyles from './game-cell.module.css';
import { GameBoard } from './game-board';

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function createBoard(): Board {
  return [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
}

describe('GameBoard', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  function renderBoard(overrides: Partial<ComponentProps<typeof GameBoard>> = {}) {
    const props: ComponentProps<typeof GameBoard> = {
      board: createBoard(),
      currentTurn: 'X',
      mySymbol: 'X',
      outcome: null,
      onCellClick: vi.fn(),
      ...overrides,
    };

    root = createRoot(container);

    act(() => {
      root?.render(<GameBoard {...props} />);
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

  it('renders a 3x3 grid with 9 cell buttons', () => {
    renderBoard();

    const grid = container.querySelector('[role="grid"]');
    const cells = container.querySelectorAll('button[role="gridcell"]');
    expect(grid).not.toBeNull();
    expect(cells).toHaveLength(9);
  });

  it('clicking an empty cell during my turn calls onCellClick', () => {
    const props = renderBoard();
    const button = container.querySelector('#cell-0-1');

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onCellClick).toHaveBeenCalledWith(0, 1);
    expect(props.onCellClick).toHaveBeenCalledTimes(1);
  });

  it('clicking an occupied cell does not call onCellClick', () => {
    const props = renderBoard({
      board: [
        ['X', null, null],
        [null, null, null],
        [null, null, null],
      ] satisfies Board,
    });
    const button = container.querySelector('#cell-0-0');

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onCellClick).not.toHaveBeenCalled();
  });

  it('disables all cells when the game outcome is non-null', () => {
    const outcome: GameOutcome = {
      type: 'win',
      winner: 'X',
      winningLine: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
    };

    renderBoard({ outcome });

    const cells = Array.from(container.querySelectorAll('button'));
    expect(cells.every((cell) => cell.hasAttribute('disabled'))).toBe(true);
  });

  it('applies the winning glow class to each winning cell', () => {
    const outcome: GameOutcome = {
      type: 'win',
      winner: 'X',
      winningLine: [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
    };

    renderBoard({
      board: [
        [null, null, null],
        ['X', 'X', 'X'],
        [null, null, null],
      ] satisfies Board,
      outcome,
    });

    expect(container.querySelector('#cell-1-0')?.className).toContain(cellStyles.winningCellX);
    expect(container.querySelector('#cell-1-1')?.className).toContain(cellStyles.winningCellX);
    expect(container.querySelector('#cell-1-2')?.className).toContain(cellStyles.winningCellX);
  });

  it('moves focus with arrow keys and wraps around the grid edges', () => {
    renderBoard();

    const firstCell = container.querySelector('#cell-0-0') as HTMLButtonElement | null;
    expect(firstCell).not.toBeNull();

    act(() => {
      firstCell?.focus();
      firstCell?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
    });

    expect(document.activeElement?.id).toBe('cell-0-2');

    const wrappedCell = container.querySelector('#cell-0-2') as HTMLButtonElement | null;

    act(() => {
      wrappedCell?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
    });

    expect(document.activeElement?.id).toBe('cell-2-2');
  });
});