import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { ChatMessage } from 'shared';

export interface ChatContextState {
  messages: ChatMessage[];
}

export type ChatAction =
  | { type: 'CHAT_SNAPSHOT_REPLACED'; payload: ChatMessage[] }
  | { type: 'CHAT_MESSAGE_RECEIVED'; payload: ChatMessage }
  | { type: 'RESET' };

export interface ChatContextValue {
  state: ChatContextState;
  dispatch: Dispatch<ChatAction>;
}

function sortByTimestamp(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}

/** Factory — always returns a fresh object to prevent shared mutable reference bugs. */
export function getInitialChatState(): ChatContextState {
  return { messages: [] };
}

export function chatReducer(state: ChatContextState, action: ChatAction): ChatContextState {
  switch (action.type) {
    case 'CHAT_SNAPSHOT_REPLACED':
      return {
        messages: sortByTimestamp(action.payload),
      };

    case 'CHAT_MESSAGE_RECEIVED': {
      if (state.messages.some((message) => message.id === action.payload.id)) {
        return state;
      }

      return {
        messages: sortByTimestamp([...state.messages, action.payload]),
      };
    }

    case 'RESET':
      return getInitialChatState();

    default:
      return state;
  }
}

export const ChatContext = createContext<ChatContextValue | undefined>(undefined);
ChatContext.displayName = 'ChatContext';
