import type { ChatMessage } from 'shared';

const CHAT_HISTORY_LIMIT = 50;
const roomChatHistory = new Map<string, ChatMessage[]>();

export function appendChatMessage(roomId: string, message: ChatMessage): ChatMessage[] {
  const currentHistory = roomChatHistory.get(roomId) ?? [];
  const nextHistory = [...currentHistory, { ...message }].slice(-CHAT_HISTORY_LIMIT);

  roomChatHistory.set(roomId, nextHistory);

  return nextHistory.map((entry) => ({ ...entry }));
}

export function getChatHistory(roomId: string): ChatMessage[] {
  const history = roomChatHistory.get(roomId) ?? [];

  return history.map((entry) => ({ ...entry }));
}

export function clearChatHistory(roomId: string): void {
  roomChatHistory.delete(roomId);
}

export function clearChatHistoryForTests(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearChatHistoryForTests is a test-only helper and cannot be used in production.');
  }

  roomChatHistory.clear();
}
