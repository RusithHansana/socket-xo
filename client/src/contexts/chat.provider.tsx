import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChatContext, initialChatState } from './chat.context';
import type { ChatContextState } from './chat.context';

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state] = useState<ChatContextState>(initialChatState);
  return <ChatContext.Provider value={state}>{children}</ChatContext.Provider>;
}
