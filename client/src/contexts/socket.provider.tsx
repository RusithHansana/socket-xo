import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SocketContext } from './socket.context';
import { createSocketConnection } from '../services/socket-service';
import type { TypedSocket } from '../services/socket-service';
import { useConnectionDispatch } from '../hooks/use-connection-dispatch';
import { useGuestIdentity } from '../hooks/use-guest-identity';
import { useSocketEvents } from '../hooks/use-socket-events';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { playerId, displayName, avatarUrl } = useGuestIdentity();
  const dispatch = useConnectionDispatch();
  const [socket, setSocket] = useState<TypedSocket | null>(null);

  useEffect(() => {
    const nextSocket = createSocketConnection(playerId, displayName, avatarUrl);
    setSocket(nextSocket);
    dispatch({ type: 'SET_CONNECTING' });
    nextSocket.connect();

    return () => {
      nextSocket.disconnect();
    };
  }, [avatarUrl, dispatch, displayName, playerId]);

  useSocketEvents(socket, playerId);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
