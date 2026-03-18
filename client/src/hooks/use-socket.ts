import { useContext, useEffect } from 'react';
import { SocketContext } from '../contexts/socket.context';
import type { TypedSocket } from '../services/socket-service';

declare global {
  interface Window {
    socket?: TypedSocket | null;
  }
}

export function useSocket(): TypedSocket | null {
  const socket = useContext(SocketContext);
  if (socket === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  useEffect(() => {
    // TODO: Remove in production - only for testing purposes.
    window.socket = socket;
  }, [socket]);

  return socket;
}