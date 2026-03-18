import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { GameOutcome, Symbol } from 'shared';
import styles from './game-outcome-modal.module.css';

export interface GameOutcomeModalProps {
  outcome: GameOutcome;
  mySymbol: Symbol;
  opponentName?: string;
  onBackToLobby: () => void;
}

function getOutcomeCopy(outcome: GameOutcome, mySymbol: Symbol, opponentName = 'the Computer') {
  if (outcome.type === 'draw') {
    return {
      heading: 'Draw',
      detail: 'Nobody found a winning line this round.',
      variantClassName: styles.draw,
    };
  }

  if (outcome.type === 'forfeit') {
    if (outcome.winner === mySymbol) {
      return {
        heading: 'You Win!',
        detail: `${opponentName} disconnected and forfeited the match.`,
        variantClassName: styles.win,
      };
    }

    return {
      heading: 'You Lose',
      detail: 'Connection was lost and the grace period expired.',
      variantClassName: styles.loss,
    };
  }

  if (outcome.type === 'win' && outcome.winner === mySymbol) {
    return {
      heading: 'You Win!',
      detail: `You outplayed ${opponentName} and closed the match.`,
      variantClassName: styles.win,
    };
  }

  return {
    heading: 'You Lose',
    detail: `${opponentName.startsWith('the ') ? opponentName.charAt(0).toUpperCase() + opponentName.slice(1) : opponentName} secured the final move this time.`,
    variantClassName: styles.loss,
  };
}

export function GameOutcomeModal({
  outcome,
  mySymbol,
  opponentName,
  onBackToLobby,
}: GameOutcomeModalProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const liveRegionId = useId();
  const copy = getOutcomeCopy(outcome, mySymbol, opponentName);
  const [announcedHeading, setAnnouncedHeading] = useState('');

  useEffect(() => {
    buttonRef.current?.focus();
    // Setting text asynchronously in useEffect ensures screen readers pick up the dynamic injection without sync setState
    const timer = window.setTimeout(() => {
      setAnnouncedHeading(copy.heading);
    }, 50);

    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onBackToLobby();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      window.clearTimeout(timer);
    };
  }, [copy.heading, onBackToLobby]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      buttonRef.current?.focus();
    }
  };

  return (
    <div className={styles.backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={liveRegionId}
        className={styles.panel}
        onKeyDown={handleKeyDown}
      >
        <div id={liveRegionId} aria-live="assertive" aria-atomic="true" className={styles.liveRegion}>
          {announcedHeading}
        </div>
        <div className={styles.copyBlock}>
          <p className={styles.kicker}>Match Complete</p>
          <h2 id={titleId} className={`${styles.heading} ${copy.variantClassName}`}>
            {copy.heading}
          </h2>
          <p className={styles.detail}>{copy.detail}</p>
        </div>
        <button
          ref={buttonRef}
          type="button"
          className={styles.primaryAction}
          onClick={onBackToLobby}
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}