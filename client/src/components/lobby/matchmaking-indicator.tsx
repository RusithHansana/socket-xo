import styles from './matchmaking-indicator.module.css';

export interface MatchmakingIndicatorProps {
  searching: boolean;
  matched: boolean;
  mode?: 'matchmaking' | 'create_room';
  onCancel: () => void;
}

export function MatchmakingIndicator({
  searching,
  matched,
  mode = 'matchmaking',
  onCancel,
}: MatchmakingIndicatorProps) {
  const isCreateRoom = mode === 'create_room';
  const announcement = matched 
    ? (isCreateRoom ? 'Room created!' : 'Match found!') 
    : 'Searching for opponent...';
    
  const eyebrowText = matched 
    ? (isCreateRoom ? 'Created' : 'Matched') 
    : 'Matchmaking';

  return (
    <section className={styles.panel} aria-label="Matchmaking status">
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <p className={styles.eyebrow}>{eyebrowText}</p>

      {matched ? (
        <h2 className={`${styles.title} ${styles.matchedTitle}`}>
          {isCreateRoom ? 'Room created!' : 'Match found!'}
        </h2>
      ) : (
        <h2 className={styles.title}>Searching for opponent...</h2>
      )}

      {searching && !matched ? (
        <div className={styles.dotRow} aria-hidden="true">
          <span className={styles.dot} data-dot="true" />
          <span className={styles.dot} data-dot="true" />
          <span className={styles.dot} data-dot="true" />
        </div>
      ) : null}

      {searching && !matched ? (
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
      ) : null}
    </section>
  );
}
