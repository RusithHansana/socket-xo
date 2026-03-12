import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocketConnection(
  playerId: string,
  displayName: string,
  avatarUrl: string,
): TypedSocket {
  return io({
    autoConnect: false,
    auth: {
      playerId,
      displayName,
      avatarUrl,
    },
  });
}