import type { KeyboardEvent, ReactNode } from 'react';
import styles from './lobby-card.module.css';

export interface LobbyCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  loading?: boolean;
}

function handleCardKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  onClick: () => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  event.preventDefault();
  onClick();
}

export function LobbyCard({
  title,
  description,
  icon,
  onClick,
  loading = false,
}: LobbyCardProps) {
  if (loading) {
    return (
      <div className={`${styles.card} ${styles.skeleton}`} data-loading="true" aria-hidden="true">
        <div className={styles.skeletonIcon} />
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonDescription} />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.card}
      aria-label={`${title} - ${description}`}
      onClick={onClick}
      onKeyDown={(event) => {
        handleCardKeyDown(event, onClick);
      }}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.title}>{title}</span>
      <span className={styles.description}>{description}</span>
    </button>
  );
}