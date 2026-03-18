import styles from './dev-mode-page.module.css';
import { useNavigate } from 'react-router-dom';
import { useConnectionStatus } from '../hooks/use-connection-status';
import { useGameState } from '../hooks/use-game-state';
import { useSocket } from '../hooks/use-socket';
import {
  DEV_MODE_LAG_MAX_MS,
  DEV_MODE_LAG_MIN_MS,
} from '../services/dev-mode-diagnostics';
import { useDevModeDiagnostics } from '../hooks/use-dev-mode-diagnostics';

function getConnectionIndicatorTone(status: string): 'green' | 'amber' | 'red' | 'neutral' {
  if (status === 'connected' || status === 'in_game') {
    return 'green';
  }

  if (status === 'connecting' || status === 'reconnecting') {
    return 'amber';
  }

  if (status === 'disconnected') {
    return 'red';
  }

  return 'neutral';
}

export default function DevModePage() {
  const navigate = useNavigate();
  const socket = useSocket();
  const connection = useConnectionStatus();
  const game = useGameState();
  const {
    state: diagnostics,
    setLagEnabled,
    setLagDelayMs,
  } = useDevModeDiagnostics();

  const connectionTone = getConnectionIndicatorTone(connection.status);
  const isDisconnected = connection.status === 'disconnected';
  const isActiveGame = game.phase === 'playing';

  const handleBackToLobby = () => {
    navigate('/');
  };

  const handleSimulateDisconnect = () => {
    if (socket === null) {
      return;
    }

    socket.disconnect();
  };

  const handleRestoreConnection = () => {
    if (socket === null) {
      return;
    }

    socket.connect();
  };

  const hasSocketLogs = diagnostics.socketLogs.length > 0;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <button type="button" onClick={handleBackToLobby} className={styles.backButton}>
          Back to Lobby
        </button>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Dev Mode</p>
            <h1 className={styles.title}>Test Lab</h1>
          </div>
          <p className={styles.description}>
            Simulate disconnect and lag scenarios while watching a live stream of socket lifecycle and game events.
          </p>
        </section>

        <section className={styles.dashboard}>
          <section className={styles.controlsColumn} aria-label="Chaos controls and diagnostics summary">
            <article className={styles.card}>
              <h2 className={styles.sectionTitle}>Connection State</h2>
              <div className={styles.connectionStatusRow}>
                <span className={`${styles.connectionDot} ${styles[connectionTone]}`} aria-hidden="true" />
                <span className={styles.connectionText}>{connection.status.replace('_', ' ')}</span>
              </div>
            </article>

            <article className={styles.card}>
              <h2 className={styles.sectionTitle}>Room / Game State</h2>
              <dl className={styles.metricsGrid}>
                <dt>Room</dt>
                <dd>{game.roomId ?? 'none'}</dd>
                <dt>Phase</dt>
                <dd>{game.phase}</dd>
                <dt>Turn</dt>
                <dd>{game.currentTurn}</dd>
                <dt>Moves</dt>
                <dd>{game.moveCount}</dd>
                <dt>Players</dt>
                <dd>{game.players.length}</dd>
              </dl>
              {game.players.length > 0 ? (
                <ul className={styles.playerList}>
                  {game.players.map((player) => (
                    <li key={player.playerId}>
                      {player.displayName} ({player.symbol}) {player.connected ? 'connected' : 'disconnected'}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <article className={styles.card}>
              <h2 className={styles.sectionTitle}>Chaos Controls</h2>
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.destructiveButton}
                  onClick={handleSimulateDisconnect}
                  disabled={socket === null || isDisconnected}
                >
                  Simulate Disconnect
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleRestoreConnection}
                  disabled={socket === null || !isDisconnected}
                >
                  Restore Connection
                </button>
              </div>

              <div className={styles.lagToggleRow}>
                <label htmlFor="simulate-lag" className={styles.toggleLabel}>
                  Simulate Lag
                </label>
                <input
                  id="simulate-lag"
                  type="checkbox"
                  checked={diagnostics.lagEnabled}
                  onChange={(event) => setLagEnabled(event.target.checked)}
                />
              </div>

              <label htmlFor="lag-delay" className={styles.sliderLabel}>
                Lag delay: <span>{diagnostics.lagDelayMs}ms</span>
              </label>
              <input
                id="lag-delay"
                type="range"
                min={DEV_MODE_LAG_MIN_MS}
                max={DEV_MODE_LAG_MAX_MS}
                step={100}
                value={diagnostics.lagDelayMs}
                onChange={(event) => setLagDelayMs(Number(event.target.value))}
                disabled={!diagnostics.lagEnabled}
              />
            </article>
          </section>

          <section className={styles.logColumn}>
            <article className={styles.card}>
              <h2 className={styles.sectionTitle}>Socket Event Log</h2>
              <div className={styles.logPanel} role="log" aria-live="polite" aria-relevant="additions text">
                {!hasSocketLogs ? (
                  <p className={styles.emptyState}>Start a game to see live socket events</p>
                ) : (
                  diagnostics.socketLogs.map((entry) => (
                    <p key={entry.id} className={styles.logEntry}>
                      <span className={styles.logTimestamp}>{entry.timestampIso}</span>{' '}
                      <span className={styles.logDirection}>[{entry.direction}]</span>{' '}
                      <span>{entry.eventName}</span>
                      {entry.details !== null ? <span> {entry.details}</span> : null}
                    </p>
                  ))
                )}
              </div>
              {!isActiveGame ? <p className={styles.logHint}>No active match detected.</p> : null}
            </article>
          </section>
        </section>
      </div>
    </main>
  );
}
