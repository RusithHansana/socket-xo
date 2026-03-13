import { createContext } from 'react';
import type { Dispatch } from 'react';

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
  searching: boolean;
}

export type ConnectionAction =
  | { type: 'SET_CONNECTING' }
  | { type: 'SET_CONNECTED' }
  | { type: 'SET_DISCONNECTED' }
  | { type: 'SET_IN_GAME' }
  | { type: 'SET_GAME_OVER' }
  | { type: 'SET_SEARCHING' }
  | { type: 'CLEAR_SEARCHING' }
  | { type: 'LEAVE_GAME' }
  | { type: 'RESET' };

export interface ConnectionContextValue {
  state: ConnectionState;
  dispatch: Dispatch<ConnectionAction>;
}

/** Factory — always returns a fresh object to prevent shared mutable reference bugs. */
export function getInitialConnectionState(): ConnectionState {
  return { status: 'idle', searching: false };
}

export function connectionReducer(
  state: ConnectionState,
  action: ConnectionAction,
): ConnectionState {
  switch (action.type) {
    case 'SET_CONNECTING': {
      if (state.status !== 'idle' && state.status !== 'disconnected') {
        return state;
      }

      return {
        status: 'connecting',
        searching: false,
      };
    }

    case 'SET_CONNECTED': {
      if (
        state.status !== 'idle' &&
        state.status !== 'connecting' &&
        state.status !== 'disconnected'
      ) {
        return state;
      }

      return {
        status: 'connected',
        searching: false,
      };
    }

    case 'SET_DISCONNECTED': {
      if (state.status === 'idle') {
        return state;
      }

      return {
        status: 'disconnected',
        searching: false,
      };
    }

    case 'SET_SEARCHING': {
      if (state.status !== 'connected') {
        return state;
      }

      return {
        status: 'connected',
        searching: true,
      };
    }

    case 'CLEAR_SEARCHING': {
      if (!state.searching) {
        return state;
      }

      return {
        status: state.status,
        searching: false,
      };
    }

    case 'SET_IN_GAME': {
      if (state.status !== 'connected') {
        return state;
      }

      return {
        status: 'in_game',
        searching: false,
      };
    }

    case 'SET_GAME_OVER': {
      if (state.status !== 'connected' && state.status !== 'in_game') {
        return state;
      }

      return {
        status: 'game_over',
        searching: false,
      };
    }

    case 'LEAVE_GAME': {
      if (state.status !== 'in_game' && state.status !== 'game_over') {
        return state;
      }

      return {
        status: 'connected',
        searching: false,
      };
    }

    case 'RESET':
      return getInitialConnectionState();

    default:
      return state;
  }
}

export const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined);
ConnectionContext.displayName = 'ConnectionContext';
