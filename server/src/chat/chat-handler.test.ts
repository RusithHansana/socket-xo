import { describe, expect, it } from 'vitest';
import type { ChatMessage } from 'shared';
import { appendChatMessage, clearChatHistoryForTests, getChatHistory } from './chat-handler.js';

function createMessage(index: number): ChatMessage {
  return {
    id: `message-${index}`,
    playerId: `player-${index % 2}`,
    displayName: `Player ${index}`,
    content: `content-${index}`,
    timestamp: 1_700_000_000_000 + index,
  };
}

describe('chat-handler', () => {
  it('appends and reads per-room chat history', () => {
    clearChatHistoryForTests();

    const roomId = 'room-1';
    const message = createMessage(1);

    appendChatMessage(roomId, message);

    expect(getChatHistory(roomId)).toEqual([message]);
  });

  it('caps room history at 50 messages and keeps most recent messages', () => {
    clearChatHistoryForTests();

    const roomId = 'room-cap';

    for (let i = 1; i <= 55; i += 1) {
      appendChatMessage(roomId, createMessage(i));
    }

    const history = getChatHistory(roomId);

    expect(history).toHaveLength(50);
    expect(history[0]?.id).toBe('message-6');
    expect(history[49]?.id).toBe('message-55');
  });

  it('keeps room histories isolated', () => {
    clearChatHistoryForTests();

    appendChatMessage('room-a', createMessage(1));
    appendChatMessage('room-b', createMessage(2));

    expect(getChatHistory('room-a')).toHaveLength(1);
    expect(getChatHistory('room-b')).toHaveLength(1);
    expect(getChatHistory('room-a')[0]?.id).toBe('message-1');
    expect(getChatHistory('room-b')[0]?.id).toBe('message-2');
  });

  it('returns cloned history to prevent caller-side mutation', () => {
    clearChatHistoryForTests();

    const roomId = 'room-clone';
    appendChatMessage(roomId, createMessage(1));

    const history = getChatHistory(roomId);
    history.push(createMessage(2));

    expect(getChatHistory(roomId)).toHaveLength(1);
  });
});
