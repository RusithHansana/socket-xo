import { useEffect, useRef, useState } from 'react';
import { createSocketConnection } from '../services/socket-service';
import type { TypedSocket } from '../services/socket-service';
import { useConnectionDispatch } from './use-connection-dispatch';
import { useGuestIdentity } from './use-guest-identity';

export function useSocket(): TypedSocket | null {
  const { playerId, displayName, avatarUrl } = useGuestIdentity();
  const dispatch = useConnectionDispatch();
  const socketRef = useRef<TypedSocket | null>(null);
  const [socket, setSocket] = useState<TypedSocket | null>(null);

  useEffect(() => {
    if (socketRef.current !== null) {
      setSocket(socketRef.current);
      return undefined;
    }

    const nextSocket = createSocketConnection(playerId, displayName, avatarUrl);
    socketRef.current = nextSocket;
    setSocket(nextSocket);
    dispatch({ type: 'SET_CONNECTING' });
    nextSocket.connect();

    return () => {
      nextSocket.disconnect();
      socketRef.current = null;
    };
  }, [avatarUrl, dispatch, displayName, playerId]);

  return socket;
}