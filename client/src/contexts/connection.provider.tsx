import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import {
  ConnectionContext,
  connectionReducer,
  getInitialConnectionState,
} from './connection.context';

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(connectionReducer, undefined, getInitialConnectionState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}
