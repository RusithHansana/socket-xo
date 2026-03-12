import { useContext } from 'react';
import type { Dispatch } from 'react';
import { ConnectionContext } from '../contexts/connection.context';
import type { ConnectionAction } from '../contexts/connection.context';

export function useConnectionDispatch(): Dispatch<ConnectionAction> {
  const ctx = useContext(ConnectionContext);

  if (ctx === undefined) {
    throw new Error('useConnectionDispatch must be used within a ConnectionProvider');
  }

  return ctx.dispatch;
}