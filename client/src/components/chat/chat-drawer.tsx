import { useState, useRef, useEffect, KeyboardEvent as ReactKeyboardEvent, TouchEvent } from 'react';
import { useChatMessages } from '../../hooks/use-chat-messages';
import { useGuestIdentity } from '../../hooks/use-guest-identity';
import { useGameState } from '../../hooks/use-game-state';
import { useSocket } from '../../hooks/use-socket';
import { sanitizeChatContent, CHAT_MESSAGE_MAX_LENGTH } from '../../utils/sanitize';
import { ChatMessage } from './chat-message';
import styles from './chat-drawer.module.css';

interface ChatDrawerProps {
  disabled?: boolean;
}

export function ChatDrawer({ disabled = false }: ChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inputValue, setInputValue] = useState('');
  
  const { messages } = useChatMessages();
  const { playerId } = useGuestIdentity();
  const { roomId } = useGameState();
  const socket = useSocket();
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousMessagesLength = useRef(messages.length);

  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (messages.length > previousMessagesLength.current) {
      if (isOpen) {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      } else {
        setUnreadCount((c) => c + (messages.length - previousMessagesLength.current));
      }
    }
    previousMessagesLength.current = messages.length;
  }, [messages.length, isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setUnreadCount(0);
  };

  const handleClose = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = () => {
    const sanitized = sanitizeChatContent(inputValue);
    if (!sanitized || !socket || !roomId) {
      return;
    }

    socket.emit('send_chat', { roomId, content: sanitized });
    setInputValue('');
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.touches[0].clientY;
    const deltaY = touchEndY - touchStartY.current;

    if (deltaY > 50) {
      handleClose();
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  if (roomId === '') {
    return null;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.triggerButton} ${disabled ? styles.triggerDisabled : ''}`}
        onClick={handleOpen}
        disabled={disabled}
        aria-label="Open chat"
        aria-expanded={isOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        {!isOpen && unreadCount > 0 && !disabled && (
          <span className={styles.badge} aria-label={`${unreadCount} unread messages`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && <div className={styles.backdrop} onClick={handleClose} aria-hidden="true" />}

      <div 
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-label="Chat"
        aria-modal="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Chat</h2>
          <button type="button" onClick={handleClose} className={styles.closeButton} aria-label="Close chat">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div 
          className={styles.messageList} 
          ref={scrollRef} 
          role="log" 
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className={styles.emptyPlaceholder}>
              <p>No messages yet — say hello!</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                isMe={message.playerId === playerId} 
              />
            ))
          )}
        </div>

        <div className={styles.inputArea}>
          <input
            ref={inputRef}
            type="text"
            className={styles.inputField}
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            disabled={disabled}
          />
          <button 
            type="button" 
            className={styles.sendButton} 
            onClick={handleSend}
            disabled={disabled || !inputValue.trim()}
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
