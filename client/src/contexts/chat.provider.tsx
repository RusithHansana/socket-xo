import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { ChatContext, chatReducer, getInitialChatState } from './chat.context';

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, undefined, getInitialChatState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
