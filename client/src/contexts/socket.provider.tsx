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
  const [socket, setSocket] = useState<TypedSocket | null>(() => 
    createSocketConnection(playerId, displayName, avatarUrl)
  );
  const [prevDeps, setPrevDeps] = useState({ playerId, displayName, avatarUrl });

  if (
    playerId !== prevDeps.playerId ||
    displayName !== prevDeps.displayName ||
    avatarUrl !== prevDeps.avatarUrl
  ) {
    setPrevDeps({ playerId, displayName, avatarUrl });
    setSocket(createSocketConnection(playerId, displayName, avatarUrl));
  }

  useEffect(() => {
    if (!socket) return;
    
    dispatch({ type: 'SET_CONNECTING' });
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [socket, dispatch]);

  useSocketEvents(socket, playerId);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
