import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import styles from './reconnect-overlay.module.css';

export interface ReconnectOverlayProps {
  gracePeriodMs?: number;
  recovered?: boolean;
  failed?: { code: string; message: string } | null;
  onRecovered?: () => void;
  onBackToLobby?: () => void;
}

function formatSeconds(seconds: number) {
  return `0:${String(Math.max(seconds, 0)).padStart(2, '0')}`;
}

export function ReconnectOverlay({
  gracePeriodMs = 30000,
  recovered = false,
  failed = null,
  onRecovered,
  onBackToLobby,
}: ReconnectOverlayProps) {
  const totalSeconds = useMemo(() => Math.ceil(gracePeriodMs / 1000), [gracePeriodMs]);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [announcement, setAnnouncement] = useState('Connection lost. Reconnecting…');
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (recovered || failed !== null) {
      return undefined;
    }

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
  }, [failed, recovered]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    overlayRef.current?.focus();

    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (failed !== null) {
      setAnnouncement('Connection could not be restored');
      return undefined;
    }

    if (!recovered) {
      setAnnouncement('Connection lost. Reconnecting…');
      return undefined;
    }

    setAnnouncement('Connection restored');

    const doneTimer = setTimeout(() => {
      onRecovered?.();
    }, 1000);

    return () => {
      clearTimeout(doneTimer);
    };
  }, [failed, onRecovered, recovered]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') {
      return;
    }

    event.preventDefault();
    overlayRef.current?.focus();
  };

  const timerClassName = [
    styles.timer,
    !recovered && secondsLeft <= 5 ? styles.timerCritical : '',
  ].join(' ').trim();

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={
        failed !== null
          ? 'Connection could not be restored'
          : recovered
            ? 'Connection restored'
            : 'Connection lost. Reconnecting'
      }
      tabIndex={-1}
      className={`${styles.overlay} ${failed !== null ? styles.overlayFailed : recovered ? styles.overlayRecovered : styles.overlayReconnecting}`}
      onKeyDown={handleKeyDown}
    >
      <p className={styles.liveRegion} aria-live="assertive" aria-atomic="true">
        {announcement}
      </p>

      {failed !== null ? (
        <div className={styles.content}>
          <h2 className={styles.errorHeading}>Connection could not be restored</h2>
          <p className={styles.errorMessage}>{failed.message}</p>
          <button type="button" className={styles.backButton} onClick={onBackToLobby}>
            Back to Lobby
          </button>
        </div>
      ) : recovered ? (
        <div className={styles.content}>
          <p className={styles.welcome}>Welcome back!</p>
        </div>
      ) : (
        <div className={styles.content}>
          <span className={styles.icon} aria-hidden="true" />
          <h2 className={styles.heading}>Reconnecting…</h2>
          <p className={timerClassName} data-testid="reconnect-timer">
            {formatSeconds(secondsLeft)}
          </p>
        </div>
      )}
    </div>
  );
}