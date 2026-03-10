import { useEffect, useRef, useState, type AnimationEvent } from 'react';
import type { Symbol } from 'shared';
import styles from './game-cell.module.css';

export interface GameCellProps {
  value: Symbol | null;
  row: number;
  col: number;
  isMyTurn: boolean;
  disabled: boolean;
  isWinningCell: boolean;
  onCellClick: (row: number, col: number) => void;
}

function playMoveSound() {
  // TODO: Add sound effects in a polish pass.
}

function getSymbolLabel(value: Symbol | null): string {
  return value ?? 'empty';
}

function renderSymbol(value: Symbol, className: string) {
  if (value === 'X') {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export function GameCell({
  value,
  row,
  col,
  isMyTurn,
  disabled,
  isWinningCell,
  onCellClick,
}: GameCellProps) {
  const [isShaking, setIsShaking] = useState(false);
  const [shouldAnimateSymbol, setShouldAnimateSymbol] = useState(false);
  const previousValueRef = useRef<Symbol | null>(value);

  useEffect(() => {
    const shouldAnimate = previousValueRef.current === null && value !== null;
    setShouldAnimateSymbol(shouldAnimate);
    previousValueRef.current = value;
  }, [value]);

  const triggerShake = () => {
    setIsShaking(true);
  };

  const handleClick = () => {
    if (disabled) {
      return;
    }

    if (value !== null || !isMyTurn) {
      triggerShake();
      return;
    }

    playMoveSound();
    onCellClick(row, col);
  };

  const handleCellAnimationEnd = (event: AnimationEvent<HTMLButtonElement>) => {
    if (event.target === event.currentTarget) {
      setIsShaking(false);
    }
  };

  const handleSymbolAnimationEnd = () => {
    setShouldAnimateSymbol(false);
  };

  const cellClasses = [
    styles.cell,
    isShaking ? styles.shaking : '',
    isWinningCell && value === 'X' ? styles.winningCellX : '',
    isWinningCell && value === 'O' ? styles.winningCellO : '',
  ]
    .filter(Boolean)
    .join(' ');

  const symbolClasses = [
    styles.symbol,
    value === 'X' ? styles.symbolX : '',
    value === 'O' ? styles.symbolO : '',
    shouldAnimateSymbol ? styles.popIn : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      id={`cell-${row}-${col}`}
      type="button"
      role="gridcell"
      className={cellClasses}
      aria-label={`Row ${row + 1}, Column ${col + 1}, ${getSymbolLabel(value)}`}
      disabled={disabled}
      onClick={handleClick}
      onAnimationEnd={handleCellAnimationEnd}
    >
      {value ? (
        <span onAnimationEnd={handleSymbolAnimationEnd}>
          {renderSymbol(value, symbolClasses)}
        </span>
      ) : null}
    </button>
  );
}