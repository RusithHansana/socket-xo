import { useState } from 'react';
import type { ReactNode } from 'react';
import { ConnectionContext, initialConnectionState } from './connection.context';
import type { ConnectionState } from './connection.context';

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state] = useState<ConnectionState>(initialConnectionState);
  return <ConnectionContext.Provider value={state}>{children}</ConnectionContext.Provider>;
}
