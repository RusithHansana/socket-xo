import { createContext } from 'react';

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

/** Factory — always returns a fresh object to prevent shared mutable reference bugs. */
export function getInitialConnectionState(): ConnectionState {
  return { status: 'idle' };
}

export const ConnectionContext = createContext<ConnectionState | undefined>(undefined);
ConnectionContext.displayName = 'ConnectionContext';
