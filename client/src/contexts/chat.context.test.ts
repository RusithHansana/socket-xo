import { describe, expect, it } from 'vitest';
import type { ChatMessage } from 'shared';
import { chatReducer, getInitialChatState, type ChatAction } from './chat.context';

function createMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    playerId: 'player-1',
    displayName: 'Player One',
    content: 'hello',
    timestamp: 10,
    ...overrides,
  };
}

describe('chatReducer', () => {
  it('replaces snapshot and sorts messages by timestamp ascending', () => {
    const newest = createMessage({ id: 'm3', timestamp: 30 });
    const oldest = createMessage({ id: 'm1', timestamp: 10 });
    const middle = createMessage({ id: 'm2', timestamp: 20 });

    const nextState = chatReducer(getInitialChatState(), {
      type: 'CHAT_SNAPSHOT_REPLACED',
      payload: [newest, oldest, middle],
    });

    expect(nextState.messages.map((message) => message.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('appends unique messages and deduplicates by id', () => {
    const existing = createMessage({ id: 'm1', timestamp: 10, content: 'first' });
    const incomingUnique = createMessage({ id: 'm2', timestamp: 20, content: 'second' });

    const baseState = chatReducer(getInitialChatState(), {
      type: 'CHAT_SNAPSHOT_REPLACED',
      payload: [existing],
    });

    const appended = chatReducer(baseState, {
      type: 'CHAT_MESSAGE_RECEIVED',
      payload: incomingUnique,
    });

    expect(appended.messages.map((message) => message.id)).toEqual(['m1', 'm2']);

    const deduped = chatReducer(appended, {
      type: 'CHAT_MESSAGE_RECEIVED',
      payload: { ...incomingUnique, content: 'duplicate payload should be ignored' },
    });

    expect(deduped.messages).toEqual(appended.messages);
  });

  it('resets to initial state', () => {
    const populated = chatReducer(getInitialChatState(), {
      type: 'CHAT_SNAPSHOT_REPLACED',
      payload: [createMessage({ id: 'm1' })],
    });

    const next = chatReducer(populated, { type: 'RESET' });

    expect(next).toEqual(getInitialChatState());
  });

  it('returns current state on unknown action', () => {
    const state = getInitialChatState();
    const unknownAction = { type: 'UNKNOWN' } as unknown as ChatAction;

    expect(chatReducer(state, unknownAction)).toBe(state);
  });
});
