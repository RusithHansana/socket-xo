import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from 'shared';
import { logger } from './utils/logger.js';

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
): void {
  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id, playerId: socket.data.playerId }, 'Client connected');

    socket.on('join_queue', () => {
      try {
        // TODO: implement in Story 2.3
        logger.debug({ playerId: socket.data.playerId }, 'join_queue received');
      } catch (err) {
        logger.error(
          {
            err: err instanceof Error ? err : new Error(String(err)),
            playerId: socket.data.playerId,
          },
          'Error handling join_queue',
        );
        socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
      }
    });

    socket.on('leave_queue', () => {
      try {
        // TODO: implement in Story 2.3
        logger.debug({ playerId: socket.data.playerId }, 'leave_queue received');
      } catch (err) {
        logger.error(
          {
            err: err instanceof Error ? err : new Error(String(err)),
            playerId: socket.data.playerId,
          },
          'Error handling leave_queue',
        );
        socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
      }
    });

    socket.on('make_move', (payload) => {
      try {
        // TODO: implement in Story 1.6
        logger.debug(
          { playerId: socket.data.playerId, roomId: payload?.roomId },
          'make_move received',
        );
      } catch (err) {
        logger.error(
          {
            err: err instanceof Error ? err : new Error(String(err)),
            playerId: socket.data.playerId,
          },
          'Error handling make_move',
        );
        socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
      }
    });

    socket.on('send_chat', (payload) => {
      try {
        // TODO: implement in Story 5.1
        logger.debug(
          { playerId: socket.data.playerId, roomId: payload?.roomId },
          'send_chat received',
        );
      } catch (err) {
        logger.error(
          {
            err: err instanceof Error ? err : new Error(String(err)),
            playerId: socket.data.playerId,
          },
          'Error handling send_chat',
        );
        socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
      }
    });

    socket.on('reconnect_attempt', (payload) => {
      try {
        // TODO: implement in Story 2.1
        logger.debug({ playerId: payload?.playerId }, 'reconnect_attempt received');
      } catch (err) {
        logger.error(
          {
            err: err instanceof Error ? err : new Error(String(err)),
            playerId: socket.data.playerId,
          },
          'Error handling reconnect_attempt',
        );
        socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
      }
    });

    socket.on('join_room', (payload) => {
      try {
        // TODO: implement in Story 4.1
        logger.debug(
          { playerId: payload?.playerId, roomId: payload?.roomId },
          'join_room received',
        );
      } catch (err) {
        logger.error(
          {
            err: err instanceof Error ? err : new Error(String(err)),
            playerId: socket.data.playerId,
          },
          'Error handling join_room',
        );
        socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug(
        { socketId: socket.id, playerId: socket.data.playerId, reason },
        'Client disconnected',
      );
    });
  });
}
