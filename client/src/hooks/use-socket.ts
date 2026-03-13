import { useContext } from 'react';
import { SocketContext } from '../contexts/socket.context';
import type { TypedSocket } from '../services/socket-service';

export function useSocket(): TypedSocket | null {
  const socket = useContext(SocketContext);
  if (socket === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return socket;
}