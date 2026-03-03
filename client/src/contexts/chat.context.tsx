import { createContext } from 'react';
import type { ChatMessage } from 'shared';

export interface ChatContextState {
  messages: ChatMessage[];
}

export const initialChatState: ChatContextState = {
  messages: [],
};

export const ChatContext = createContext<ChatContextState | undefined>(undefined);
