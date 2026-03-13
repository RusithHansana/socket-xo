import styles from './matchmaking-indicator.module.css';

export interface MatchmakingIndicatorProps {
  searching: boolean;
  matched: boolean;
  onCancel: () => void;
}

export function MatchmakingIndicator({
  searching,
  matched,
  onCancel,
}: MatchmakingIndicatorProps) {
  const announcement = matched ? 'Match found!' : 'Searching for opponent';

  return (
    <section className={styles.panel} aria-label="Matchmaking status">
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <p className={styles.eyebrow}>{matched ? 'Matched' : 'Matchmaking'}</p>

      {matched ? (
        <h2 className={`${styles.title} ${styles.matchedTitle}`}>Match found!</h2>
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
