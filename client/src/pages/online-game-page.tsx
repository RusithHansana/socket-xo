import type { PlayerInfo, Symbol } from 'shared';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { GameBoard } from '../components/game/game-board';
import { GameOutcomeModal } from '../components/game/game-outcome-modal';
import { PlayerIdentity } from '../components/game/player-identity';
import { TurnIndicator } from '../components/game/turn-indicator';
import { useConnectionDispatch } from '../hooks/use-connection-dispatch';
import { useConnectionStatus } from '../hooks/use-connection-status';
import { useGameDispatch } from '../hooks/use-game-dispatch';
import { useGameState } from '../hooks/use-game-state';
import { useGuestIdentity } from '../hooks/use-guest-identity';
import { useSocket } from '../hooks/use-socket';

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
    gameDispatch({ type: 'RESET' });
    connectionDispatch({ type: 'RESET' });
    navigate('/');
  };

  const handleCellClick = (row: number, col: number) => {
    if (socket === null || activeRoomId.length === 0) {
      return;
    }

    socket.emit('make_move', { roomId: activeRoomId, position: { row, col } });
  };

  const isLoading = gameState.phase === 'waiting' || status === 'idle' || status === 'connecting';

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
          onBackToLobby={handleBackToLobby}
        />
      ) : null}
    </main>
  );
}
