import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LobbyCard } from '../components/lobby/lobby-card';
import { MatchmakingIndicator } from '../components/lobby/matchmaking-indicator';
import { useConnectionDispatch } from '../hooks/use-connection-dispatch';
import { useConnectionStatus } from '../hooks/use-connection-status';
import { useGameState } from '../hooks/use-game-state';
import { useGuestIdentity } from '../hooks/use-guest-identity';
import { useSocket } from '../hooks/use-socket';
import styles from './lobby-page.module.css';

const MATCH_FOUND_DELAY_MS = 800;

function OnlineIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.cardIcon} focusable="false" aria-hidden="true">
      <path
        d="M4 17a8 8 0 0 1 16 0M7.5 13.5a4.5 4.5 0 0 1 9 0M12 18.5h.01"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function AiIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.cardIcon} focusable="false" aria-hidden="true">
      <path
        d="M9 4h6m-3 0v3m-5 2.5h10A2.5 2.5 0 0 1 19.5 12v4A2.5 2.5 0 0 1 17 18.5H7A2.5 2.5 0 0 1 4.5 16v-4A2.5 2.5 0 0 1 7 9.5Zm1.5 3h.01m7 0h.01M9.5 15h5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const { displayName, avatarUrl } = useGuestIdentity();
  const { status, searching } = useConnectionStatus();
  const connectionDispatch = useConnectionDispatch();
  const gameState = useGameState();
  const socket = useSocket();
  const [matchedRoomId, setMatchedRoomId] = useState<string | null>(null);
  const isLoading = status === 'idle' || status === 'connecting';
  const showMatched = matchedRoomId !== null;
  const showMatchmaking = searching || showMatched;

  useEffect(() => {
    if (status === 'in_game' && gameState.roomId !== null) {
      setMatchedRoomId(gameState.roomId);
      return;
    }

    setMatchedRoomId(null);
  }, [gameState.roomId, status]);

  useEffect(() => {
    if (matchedRoomId === null) {
      return;
    }

    const navigationDelay = window.setTimeout(() => {
      navigate(`/game/${matchedRoomId}`);
    }, MATCH_FOUND_DELAY_MS);

    return () => {
      window.clearTimeout(navigationDelay);
    };
  }, [matchedRoomId, navigate]);

  const handleJoinQueue = () => {
    if (socket !== null) {
      socket.emit('join_queue');
    }
  };

  const handleCancelQueue = () => {
    if (socket !== null) {
      socket.emit('leave_queue');
    }

    connectionDispatch({ type: 'CLEAR_SEARCHING' });
  };

  return (
    <main className={styles.page}>
      <a href="#lobby-actions" className={styles.skipLink}>
        Skip to lobby
      </a>

      <div className={styles.orb} aria-hidden="true" />

      <section className={styles.content}>
        <header
          className={styles.identityCard}
          tabIndex={0}
          aria-label={`Guest identity for ${displayName}`}
        >
          <img className={styles.avatar} src={avatarUrl} alt={`Avatar for ${displayName}`} />
          <div className={styles.identityCopy}>
            <p className={styles.identityLabel}>Guest profile</p>
            <p className={styles.identityName}>{displayName}</p>
          </div>
        </header>

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>socket-xo</p>
          <h1>Choose your next match.</h1>
          <p className={styles.description}>
            Start a quick AI challenge or jump straight into live online matchmaking.
          </p>
        </div>

        <div id="lobby-actions" className={styles.actions} tabIndex={-1}>
          {showMatchmaking ? (
            <MatchmakingIndicator
              searching={searching}
              matched={showMatched}
              onCancel={handleCancelQueue}
            />
          ) : (
            <>
              <LobbyCard
                title="Play Online"
                description="Find an opponent and queue for a live match."
                icon={<OnlineIcon />}
                onClick={handleJoinQueue}
                loading={isLoading}
              />
              <LobbyCard
                title="Play AI"
                description="Challenge the AI in a fast solo match."
                icon={<AiIcon />}
                onClick={() => {
                  navigate('/ai');
                }}
                loading={isLoading}
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
