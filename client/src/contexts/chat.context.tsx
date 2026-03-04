import { createContext } from 'react';
import type { ChatMessage } from 'shared';

export interface ChatContextState {
  messages: ChatMessage[];
}

/** Factory — always returns a fresh object to prevent shared mutable reference bugs. */
export function getInitialChatState(): ChatContextState {
  return { messages: [] };
}

export const ChatContext = createContext<ChatContextState | undefined>(undefined);
