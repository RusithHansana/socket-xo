// @vitest-environment jsdom

import { act } from 'react';
import type { ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import styles from './game-cell.module.css';
import { GameCell } from './game-cell';

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('GameCell', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  function renderCell(overrides: Partial<ComponentProps<typeof GameCell>> = {}) {
    const props: ComponentProps<typeof GameCell> = {
      value: null,
      row: 0,
      col: 0,
      isMyTurn: true,
      disabled: false,
      isWinningCell: false,
      onCellClick: vi.fn(),
      ...overrides,
    };

    root = createRoot(container);

    act(() => {
      root?.render(<GameCell {...props} />);
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

  it('renders an empty cell with the correct aria-label', () => {
    renderCell({ row: 1, col: 2 });

    const button = container.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe('Row 2, Column 3, empty');
  });

  it('renders an X symbol with the primary color class', () => {
    renderCell({ value: 'X' });

    const symbol = container.querySelector('svg');
    expect(symbol?.className.baseVal).toContain(styles.symbolX);
  });

  it('renders an O symbol with the secondary color class', () => {
    renderCell({ value: 'O' });

    const symbol = container.querySelector('svg');
    expect(symbol?.className.baseVal).toContain(styles.symbolO);
  });

  it('calls onCellClick with row and col when an empty cell is clicked during my turn', () => {
    const props = renderCell({ row: 2, col: 1 });
    const button = container.querySelector('button');

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onCellClick).toHaveBeenCalledWith(2, 1);
    expect(props.onCellClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onCellClick when the cell is occupied', () => {
    const props = renderCell({ value: 'X' });
    const button = container.querySelector('button');

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onCellClick).not.toHaveBeenCalled();
    expect(button?.className).toContain(styles.shaking);
  });

  it('does not call onCellClick when the cell is disabled', () => {
    const props = renderCell({ disabled: true });
    const button = container.querySelector('button');

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onCellClick).not.toHaveBeenCalled();
  });

  it('applies a winning glow class when the cell is part of a winning line', () => {
    renderCell({ value: 'X', isWinningCell: true });

    const button = container.querySelector('button');
    expect(button?.className).toContain(styles.winningCellX);
  });
});