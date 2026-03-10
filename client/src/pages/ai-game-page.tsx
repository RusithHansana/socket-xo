import { Link, useNavigate } from 'react-router-dom';
import { GameBoard } from '../components/game/game-board';
import { GameOutcomeModal } from '../components/game/game-outcome-modal';
import { PlayerIdentity } from '../components/game/player-identity';
import { TurnIndicator } from '../components/game/turn-indicator';
import { useAiGame } from '../hooks/use-ai-game';
import styles from './ai-game-page.module.css';

export default function AIGamePage() {
  const navigate = useNavigate();
  const { gameState, playerInfo, aiInfo, makeMove, isConnected } = useAiGame();

  const handleBackToLobby = () => {
    navigate('/');
  };

  if (gameState === null) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Link to="/" className={styles.backButton}>
            Back to Lobby
          </Link>
          <section className={styles.loadingCard} aria-live="polite" aria-busy="true">
            <p className={styles.loadingEyebrow}>Connecting</p>
            <h1 className={styles.loadingTitle}>Preparing your AI match</h1>
            <p className={styles.loadingText}>
              {isConnected ? 'Creating a fresh board state on the server.' : 'Establishing the game connection.'}
            </p>
          </section>
        </div>
      </main>
    );
  }

  const xPlayer = gameState.players.find((player) => player.symbol === 'X') ?? playerInfo;
  const oPlayer = gameState.players.find((player) => player.symbol === 'O') ?? aiInfo;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link to="/" className={styles.backButton}>
          Back to Lobby
        </Link>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Solo Match</p>
            <h1 className={styles.title}>Play the full game against the AI</h1>
          </div>
          <p className={styles.description}>
            Every move is validated on the server, and the AI answers with the next authoritative state.
          </p>
        </section>

        <section className={styles.playerGrid} aria-label="Player identities">
          <PlayerIdentity player={xPlayer} isActive={gameState.currentTurn === xPlayer.symbol} />
          <PlayerIdentity player={oPlayer} isActive={gameState.currentTurn === oPlayer.symbol} />
        </section>

        <section className={styles.gamePanel}>
          <TurnIndicator currentTurn={gameState.currentTurn} mySymbol={playerInfo.symbol} />
          <div className={styles.boardFrame}>
            <GameBoard
              board={gameState.board}
              currentTurn={gameState.currentTurn}
              mySymbol={playerInfo.symbol}
              outcome={gameState.outcome}
              onCellClick={makeMove}
              disabled={!isConnected}
            />
          </div>
        </section>
      </div>

      {gameState.outcome !== null ? (
        <GameOutcomeModal
          outcome={gameState.outcome}
          mySymbol={playerInfo.symbol}
          onBackToLobby={handleBackToLobby}
        />
      ) : null}
    </main>
  );
}
