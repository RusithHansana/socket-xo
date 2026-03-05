import styles from './dev-mode-page.module.css';
import { useConnectionStatus } from '../hooks/use-connection-status';
import { useGameState } from '../hooks/use-game-state';
import { useChatMessages } from '../hooks/use-chat-messages';

export default function DevModePage() {
  const connection = useConnectionStatus();
  const game = useGameState();
  const chat = useChatMessages();

  const debugInfo = {
    connection,
    game: {
      roomId: game.roomId,
      phase: game.phase,
      currentTurn: game.currentTurn,
      moveCount: game.moveCount,
      players: game.players,
    },
    chat: { messageCount: chat.messages.length },
  };

  return (
    <main className={styles.page}>
      <h1>Dev Mode / Test Lab</h1>
      <p className={styles.description}>Debug and chaos controls coming soon.</p>
      <pre className={styles.debugPanel}>{JSON.stringify(debugInfo, null, 2)}</pre>
    </main>
  );
}
