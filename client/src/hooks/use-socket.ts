import { useContext } from 'react';
import { SocketContext } from '../contexts/socket.context';
import type { TypedSocket } from '../services/socket-service';

export function useSocket(): TypedSocket | null {
  const socket = useContext(SocketContext);
  if (socket === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  //TODO: Remove in production - only for testing purposes
  (window as any).socket = socket; // Expose the socket for testing purposes

  return socket;
}