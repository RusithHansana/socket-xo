import { useContext } from 'react';
import type { Dispatch } from 'react';
import { ChatContext } from '../contexts/chat.context';
import type { ChatAction } from '../contexts/chat.context';

export function useChatDispatch(): Dispatch<ChatAction> {
  const ctx = useContext(ChatContext);

  if (ctx === undefined) {
    throw new Error('useChatDispatch must be used within a ChatProvider');
  }

  return ctx.dispatch;
}
