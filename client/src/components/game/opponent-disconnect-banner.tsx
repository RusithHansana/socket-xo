import { useEffect, useMemo, useState } from 'react';
import styles from './opponent-disconnect-banner.module.css';

export interface OpponentDisconnectBannerProps {
  gracePeriodMs: number;
  reconnected?: boolean;
  onReconnected?: () => void;
}

function formatSeconds(seconds: number) {
  return `0:${String(Math.max(seconds, 0)).padStart(2, '0')}`;
}

export function OpponentDisconnectBanner({
  gracePeriodMs,
  reconnected = false,
  onReconnected,
}: OpponentDisconnectBannerProps) {
  const totalSeconds = useMemo(() => Math.ceil(gracePeriodMs / 1000), [gracePeriodMs]);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [announcement, setAnnouncement] = useState('Opponent disconnected');

  useEffect(() => {
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (reconnected) {
      setAnnouncement('Opponent reconnected');

      const timer = setTimeout(() => {
        onReconnected?.();
      }, 1500);

      return () => {
        clearTimeout(timer);
      };
    }

    setAnnouncement('Opponent disconnected');

    const timer = setInterval(() => {
      setSecondsLeft((previousSeconds) => {
        if (previousSeconds <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previousSeconds - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [onReconnected, reconnected]);

  const timerClassName = [styles.timer, !reconnected && secondsLeft <= 5 ? styles.timerCritical : ''].join(' ').trim();

  return (
    <div className={styles.container} role="status" aria-live="polite" aria-atomic="true">
      <span className={styles.indicatorWrap} aria-hidden="true">
        <span
          className={`${styles.indicator} ${reconnected ? styles.indicatorRecovered : styles.indicatorWaiting}`}
          data-testid="disconnect-indicator"
        />
      </span>

      {reconnected ? (
        <p className={styles.message}>{announcement}</p>
      ) : (
        <p className={styles.message}>
          Opponent disconnected - waiting{' '}
          <span className={timerClassName} data-testid="disconnect-timer">
            {formatSeconds(secondsLeft)}
          </span>
        </p>
      )}
    </div>
  );
}
