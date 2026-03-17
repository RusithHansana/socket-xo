import { useContext } from 'react';
import { ChatContext } from '../contexts/chat.context';
import type { ChatContextState } from '../contexts/chat.context';

export function useChatMessages(): ChatContextState {
  const ctx = useContext(ChatContext);
  if (ctx === undefined) {
    throw new Error('useChatMessages must be used within a ChatProvider');
  }

  return ctx.state;
}
