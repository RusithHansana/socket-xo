import { Server } from 'socket.io';
import { logger } from './utils/logger';

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'Client connected');

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Client disconnected');
    });
  });
}
