import type { KeyboardEvent, ReactNode } from 'react';
import styles from './lobby-card.module.css';

export interface LobbyCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  loading?: boolean;
}

export function LobbyCard({
  title,
  description,
  icon,
  onClick,
  loading = false,
}: LobbyCardProps) {
  return (
    <button
      type="button"
      className={`${styles.card} ${loading ? styles.skeleton : ''}`}
      data-loading={loading ? 'true' : undefined}
      aria-label={`${title} - ${description}`}
      aria-busy={loading}
      disabled={loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          <div className={styles.skeletonIcon} />
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonDescription} />
        </>
      ) : (
        <>
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
          <span className={styles.title}>{title}</span>
          <span className={styles.description}>{description}</span>
        </>
      )}
    </button>
  );
}