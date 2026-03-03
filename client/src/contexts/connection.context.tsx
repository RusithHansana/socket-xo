import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Connection states follow the FSM from architecture:
// idle → connecting → connected → in_game → (disconnected → reconnecting → connected) | forfeit → game_over
export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'in_game'
  | 'disconnected'
  | 'reconnecting'
  | 'game_over';

export interface ConnectionState {
  status: ConnectionStatus;
}

const initialConnectionState: ConnectionState = {
  status: 'idle',
};

const ConnectionContext = createContext<ConnectionState | undefined>(undefined);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state] = useState<ConnectionState>(initialConnectionState);
  return <ConnectionContext.Provider value={state}>{children}</ConnectionContext.Provider>;
}

export function useConnectionStatus(): ConnectionState {
  const ctx = useContext(ConnectionContext);
  if (ctx === undefined) {
    throw new Error('useConnectionStatus must be used within a ConnectionProvider');
  }
  return ctx;
}
