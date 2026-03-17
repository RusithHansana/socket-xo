import type { ChatMessage as ChatMessageType } from 'shared';
import { useGameState } from '../../hooks/use-game-state';
import styles from './chat-message.module.css';

interface ChatMessageProps {
  message: ChatMessageType;
  isMe: boolean;
}

export function ChatMessage({ message, isMe }: ChatMessageProps) {
  const gameState = useGameState();
  const player = gameState.players.find((p) => p.playerId === message.playerId);
  
  const avatarUrl = player?.avatarUrl ?? `https://robohash.org/${message.playerId}`;
  
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`${styles.messageWrapper} ${isMe ? styles.messageMe : styles.messageOpponent}`}>
      <img src={avatarUrl} alt="" className={styles.avatar} aria-hidden="true" />
      <div className={styles.messageContent}>
        <div className={styles.header}>
          <span className={styles.name}>{message.displayName}</span>
          <span className={styles.time}>{formattedTime}</span>
        </div>
        <p className={styles.text}>{message.content}</p>
      </div>
    </div>
  );
}
