import type { Symbol } from 'shared';
import styles from './turn-indicator.module.css';

export interface TurnIndicatorProps {
  currentTurn: Symbol;
  mySymbol: Symbol;
}

export function TurnIndicator({ currentTurn, mySymbol }: TurnIndicatorProps) {
  const isMyTurn = currentTurn === mySymbol;
  const label = isMyTurn ? 'Your Turn' : "Opponent's Turn";
  const textClasses = [
    styles.text,
    styles.slideIn,
    isMyTurn ? styles.yourTurn : styles.opponentTurn,
  ].join(' ');

  return (
    <div aria-live="polite" aria-atomic="true" className={styles.container}>
      <span key={currentTurn} className={textClasses}>
        {label}
      </span>
    </div>
  );
}