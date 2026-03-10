import type { KeyboardEvent } from 'react';
import { BOARD_SIZE, type Board, type GameOutcome, type Symbol } from 'shared';
import { GameCell } from './game-cell';
import styles from './game-board.module.css';

export interface GameBoardProps {
  board: Board;
  currentTurn: Symbol;
  mySymbol: Symbol;
  outcome: GameOutcome | null;
  onCellClick: (row: number, col: number) => void;
  disabled?: boolean;
}

function getCellId(row: number, col: number) {
  return `cell-${row}-${col}`;
}

function getWinningCellKeys(outcome: GameOutcome | null): Set<string> {
  if (outcome?.winningLine === null || outcome?.winningLine === undefined) {
    return new Set<string>();
  }

  return new Set(
    outcome.winningLine.map((position) => `${position.row}-${position.col}`),
  );
}

export function GameBoard({
  board,
  currentTurn,
  mySymbol,
  outcome,
  onCellClick,
  disabled = false,
}: GameBoardProps) {
  const isMyTurn = currentTurn === mySymbol;
  const winningCellKeys = getWinningCellKeys(outcome);
  const isBoardDisabled = disabled || outcome !== null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const matches = /^cell-(\d+)-(\d+)$/.exec(target.id);

    if (matches === null) {
      return;
    }

    const row = Number(matches[1]);
    const col = Number(matches[2]);
    let nextRow = row;
    let nextCol = col;

    switch (event.key) {
      case 'ArrowUp':
        nextRow = (row + BOARD_SIZE - 1) % BOARD_SIZE;
        break;
      case 'ArrowDown':
        nextRow = (row + 1) % BOARD_SIZE;
        break;
      case 'ArrowLeft':
        nextCol = (col + BOARD_SIZE - 1) % BOARD_SIZE;
        break;
      case 'ArrowRight':
        nextCol = (col + 1) % BOARD_SIZE;
        break;
      case 'Home':
        nextRow = 0;
        nextCol = 0;
        break;
      case 'End':
        nextRow = BOARD_SIZE - 1;
        nextCol = BOARD_SIZE - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    document.getElementById(getCellId(nextRow, nextCol))?.focus();
  };

  const boardClasses = [
    styles.board,
    isMyTurn && !isBoardDisabled ? styles.myTurn : styles.waitingTurn,
  ].join(' ');

  return (
    <div
      role="grid"
      aria-label="Tic-Tac-Toe game board"
      className={boardClasses}
      onKeyDown={handleKeyDown}
    >
      {board.map((boardRow, rowIndex) => (
        <div key={`row-${rowIndex}`} role="row" className={styles.row}>
          {boardRow.map((value, colIndex) => (
            <GameCell
              key={getCellId(rowIndex, colIndex)}
              value={value}
              row={rowIndex}
              col={colIndex}
              isMyTurn={isMyTurn}
              disabled={isBoardDisabled}
              isWinningCell={winningCellKeys.has(`${rowIndex}-${colIndex}`)}
              onCellClick={onCellClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
}