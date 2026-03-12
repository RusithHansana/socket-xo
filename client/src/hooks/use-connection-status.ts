import { useContext } from 'react';
import { ConnectionContext } from '../contexts/connection.context';
import type { ConnectionState } from '../contexts/connection.context';

export function useConnectionStatus(): ConnectionState {
  const ctx = useContext(ConnectionContext);
  if (ctx === undefined) {
    throw new Error('useConnectionStatus must be used within a ConnectionProvider');
  }

  return ctx.state;
}
