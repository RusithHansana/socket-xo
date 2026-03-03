import { createContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ChatMessage } from 'shared';

export interface ChatContextState {
  messages: ChatMessage[];
}

const initialChatState: ChatContextState = {
  messages: [],
};

export const ChatContext = createContext<ChatContextState | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state] = useState<ChatContextState>(initialChatState);
  return <ChatContext.Provider value={state}>{children}</ChatContext.Provider>;
}
