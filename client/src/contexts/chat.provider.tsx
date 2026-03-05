import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChatContext, getInitialChatState } from './chat.context';
import type { ChatContextState } from './chat.context';

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state] = useState<ChatContextState>(getInitialChatState);
  return <ChatContext.Provider value={state}>{children}</ChatContext.Provider>;
}
