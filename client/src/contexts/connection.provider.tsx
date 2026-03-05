import { useState } from 'react';
import type { ReactNode } from 'react';
import { ConnectionContext, getInitialConnectionState } from './connection.context';
import type { ConnectionState } from './connection.context';

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state] = useState<ConnectionState>(getInitialConnectionState);
  return <ConnectionContext.Provider value={state}>{children}</ConnectionContext.Provider>;
}
