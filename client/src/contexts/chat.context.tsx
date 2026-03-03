import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ChatMessage } from 'shared';

export interface ChatContextState {
  messages: ChatMessage[];
}

const initialChatState: ChatContextState = {
  messages: [],
};

const ChatContext = createContext<ChatContextState | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state] = useState<ChatContextState>(initialChatState);
  return <ChatContext.Provider value={state}>{children}</ChatContext.Provider>;
}

export function useChatMessages(): ChatContextState {
  const ctx = useContext(ChatContext);
  if (ctx === undefined) {
    throw new Error('useChatMessages must be used within a ChatProvider');
  }
  return ctx;
}
