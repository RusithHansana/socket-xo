import { useEffect, useRef, useState } from 'react';
import { GRACE_PERIOD_MS, type PlayerInfo, type Symbol } from 'shared';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { GameBoard } from '../components/game/game-board';
import { OpponentDisconnectBanner } from '../components/game/opponent-disconnect-banner';
import { GameOutcomeModal } from '../components/game/game-outcome-modal';
import { PlayerIdentity } from '../components/game/player-identity';
import { ReconnectOverlay } from '../components/game/reconnect-overlay';
import { TurnIndicator } from '../components/game/turn-indicator';
import { useConnectionDispatch } from '../hooks/use-connection-dispatch';
import { useConnectionStatus } from '../hooks/use-connection-status';
import { useGameDispatch } from '../hooks/use-game-dispatch';
import { useGameState } from '../hooks/use-game-state';
import { useGuestIdentity } from '../hooks/use-guest-identity';
import { useSocket } from '../hooks/use-socket';
import { clearReconnectToken, getReconnectToken } from '../services/reconnect-token-service';

/** The resolved success payload from onlineGamePageLoader (redirect path never reaches the component). */
type LoaderData = { roomId: string };

/**
 * Runtime type guard — validates the loader data shape before use,
 * replacing the unsafe direct `as LoaderData` cast.
 */
function asLoaderData(data: unknown): LoaderData {
  if (
    typeof data === 'object' &&
    data !== null &&
    'roomId' in data &&
    typeof (data as Record<string, unknown>).roomId === 'string'
  ) {
    return { roomId: (data as Record<string, unknown>).roomId as string };
  }

  return { roomId: '' };
}

import styles from './online-game-page.module.css';

function createFallbackPlayer(playerId: string, displayName: string, avatarUrl: string, symbol: Symbol): PlayerInfo {
  return {
    playerId,
    displayName,
    avatarUrl,
    symbol,
    connected: true,
  };
}

export default function OnlineGamePage() {
  const navigate = useNavigate();
  const { roomId } = asLoaderData(useLoaderData());
  const gameState = useGameState();
  const { status } = useConnectionStatus();
  const { playerId, displayName, avatarUrl } = useGuestIdentity();
  const socket = useSocket();
  const gameDispatch = useGameDispatch();
  const connectionDispatch = useConnectionDispatch();
  const [showRecoveredOverlay, setShowRecoveredOverlay] = useState(false);
  const [showReconnectedBanner, setShowReconnectedBanner] = useState(false);
  const joinAttemptedRef = useRef(false);
  const [copyLabel, setCopyLabel] = useState<'copy' | 'copied' | 'failed'>('copy');
  const previousStatusRef = useRef(status);
  const previousOpponentDisconnectRef = useRef(gameState.opponentDisconnect);

  useEffect(() => {
    joinAttemptedRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (socket === null || roomId.length === 0 || status !== 'connected' || joinAttemptedRef.current) {
      return;
    }

    if (gameState.roomId === roomId) {
      return;
    }

    if (getReconnectToken(playerId) !== null) {
      return;
    }

    socket.emit('join_room', { roomId, playerId });
    joinAttemptedRef.current = true;
  }, [gameState.roomId, playerId, roomId, socket, status]);

  useEffect(() => {
    const previousOpponentDisconnect = previousOpponentDisconnectRef.current;

    if (gameState.opponentDisconnect === null && previousOpponentDisconnect !== null && gameState.outcome === null) {
      setShowReconnectedBanner(true);
    }

    if (gameState.opponentDisconnect !== null) {
      setShowReconnectedBanner(false);
    }

    if (gameState.outcome !== null) {
      setShowReconnectedBanner(false);
    }

    previousOpponentDisconnectRef.current = gameState.opponentDisconnect;
  }, [gameState.opponentDisconnect, gameState.outcome]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;

    if (status === 'disconnected') {
      setShowRecoveredOverlay(false);
    }

    if (
      previousStatus === 'disconnected'
      && status === 'in_game'
      && gameState.phase === 'playing'
      && gameState.outcome === null
    ) {
      setShowRecoveredOverlay(true);
    }

    if (status === 'game_over' || gameState.outcome !== null) {
      setShowRecoveredOverlay(false);
    }

    previousStatusRef.current = status;
  }, [gameState.outcome, gameState.phase, status]);

  const activeRoomId = gameState.roomId ?? roomId;
  const myPlayer = gameState.players.find((player) => player.playerId === playerId);
  const mySymbol: Symbol = myPlayer?.symbol ?? 'X';
  const fallbackMe = createFallbackPlayer(playerId, displayName, avatarUrl, mySymbol);
  const fallbackOpponent = createFallbackPlayer(
    'opponent',
    'Opponent',
    'https://robohash.org/opponent',
    mySymbol === 'X' ? 'O' : 'X',
  );
  const xPlayer = gameState.players.find((player) => player.symbol === 'X')
    ?? (fallbackMe.symbol === 'X' ? fallbackMe : fallbackOpponent);
  const oPlayer = gameState.players.find((player) => player.symbol === 'O')
    ?? (fallbackMe.symbol === 'O' ? fallbackMe : fallbackOpponent);

  const handleBackToLobby = () => {
    clearReconnectToken(playerId);
    gameDispatch({ type: 'RESET' });
    connectionDispatch({ type: 'LEAVE_GAME' });
    navigate('/');
  };

  const handleCellClick = (row: number, col: number) => {
    if (socket === null || activeRoomId.length === 0) {
      return;
    }

    socket.emit('make_move', { roomId: activeRoomId, position: { row, col } });
  };

  const handleCopyLink = async () => {
    if (activeRoomId.length === 0) {
      return;
    }

    const roomLink = `${window.location.origin}/game/${activeRoomId}`;

    try {
      await navigator.clipboard.writeText(roomLink);
      setCopyLabel('copied');
    } catch {
      setCopyLabel('failed');
    }
  };

  const roomLink = activeRoomId.length > 0 ? `${window.location.origin}/game/${activeRoomId}` : '';
  const isLoading = status === 'idle' || status === 'connecting';
  const isWaitingForOpponent = gameState.phase === 'waiting' && activeRoomId.length > 0;

  if (gameState.roomError !== null) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.errorCard} aria-live="assertive">
            <p className={styles.loadingEyebrow}>Room unavailable</p>
            <h1 className={styles.loadingTitle}>{gameState.roomError.message}</h1>
            <button type="button" onClick={handleBackToLobby} className={styles.primaryButton}>
              Go to Lobby
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (isWaitingForOpponent) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <button type="button" onClick={handleBackToLobby} className={styles.backButton}>
            Back to Lobby
          </button>
          <section className={styles.waitingCard} aria-live="polite" aria-atomic="true">
            <p className={styles.loadingEyebrow}>Room created</p>
            <h1 className={styles.loadingTitle}>Waiting for opponent</h1>
            <p className={styles.loadingText}>Share this link to invite a friend.</p>

            <div className={styles.linkRow}>
              <p className={styles.linkText}>{roomLink}</p>
              <button type="button" onClick={handleCopyLink} className={styles.secondaryButton}>
                {copyLabel === 'copy' ? 'Copy Link' : copyLabel === 'copied' ? 'Copied' : 'Copy Failed'}
              </button>
            </div>

            <section className={styles.playerGrid} aria-label="Player identities">
              <PlayerIdentity player={fallbackMe} isActive />
            </section>

            <div className={styles.waitingDots} aria-hidden="true">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <button type="button" onClick={handleBackToLobby} className={styles.backButton}>
            Back to Lobby
          </button>
          <section className={styles.loadingCard} aria-live="polite" aria-busy="true">
            <p className={styles.loadingEyebrow}>Connecting</p>
            <h1 className={styles.loadingTitle}>Preparing your online match</h1>
            <p className={styles.loadingText}>Waiting for both players to receive the server-authoritative game state.</p>
          </section>
        </div>
      </main>
    );
  }

  const opponent = gameState.players.find((p) => p.playerId !== playerId);
  const opponentName = opponent?.displayName ?? 'your opponent';
  const showDisconnectedOverlay = status === 'disconnected' && gameState.phase === 'playing';
  const showReconnectSuccessOverlay =
    showRecoveredOverlay && gameState.phase === 'playing' && gameState.outcome === null;
  const showReconnectFailedOverlay = gameState.reconnectError !== null;
  const showOpponentDisconnectBanner =
    gameState.outcome === null && (gameState.opponentDisconnect !== null || showReconnectedBanner);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <button type="button" onClick={handleBackToLobby} className={styles.backButton}>
          Back to Lobby
        </button>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Online Match</p>
            <h1 className={styles.title}>Real-time game synchronization</h1>
          </div>
          <p className={styles.description}>
            Room <strong>{activeRoomId}</strong> is fully server-authoritative: every move updates both players from the same broadcast state.
          </p>
        </section>

        <section className={styles.playerGrid} aria-label="Player identities">
          <PlayerIdentity player={xPlayer} isActive={gameState.currentTurn === 'X'} />
          <PlayerIdentity player={oPlayer} isActive={gameState.currentTurn === 'O'} />
        </section>

        <section className={styles.gamePanel}>
          {showOpponentDisconnectBanner ? (
            <OpponentDisconnectBanner
              gracePeriodMs={gameState.opponentDisconnect?.gracePeriodMs ?? GRACE_PERIOD_MS}
              reconnected={gameState.opponentDisconnect === null && showReconnectedBanner}
              onReconnected={() => setShowReconnectedBanner(false)}
            />
          ) : null}

          <TurnIndicator currentTurn={gameState.currentTurn} mySymbol={mySymbol} />
          <div className={styles.boardFrame}>
            <GameBoard
              board={gameState.board}
              currentTurn={gameState.currentTurn}
              mySymbol={mySymbol}
              outcome={gameState.outcome}
              onCellClick={handleCellClick}
              disabled={status !== 'in_game'}
            />
          </div>
        </section>
      </div>

      {gameState.outcome !== null ? (
        <GameOutcomeModal
          outcome={gameState.outcome}
          mySymbol={mySymbol}
          opponentName={opponentName}
          onBackToLobby={handleBackToLobby}
        />
      ) : null}

      {showDisconnectedOverlay || showReconnectSuccessOverlay || showReconnectFailedOverlay ? (
        <ReconnectOverlay
          gracePeriodMs={GRACE_PERIOD_MS}
          recovered={showReconnectSuccessOverlay}
          failed={gameState.reconnectError}
          onBackToLobby={handleBackToLobby}
          onRecovered={() => setShowRecoveredOverlay(false)}
        />
      ) : null}
    </main>
  );
}
