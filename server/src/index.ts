import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { registerSocketHandlers } from './socket-handler.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from 'shared';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  },
);

io.use((socket, next) => {
  const playerId = socket.handshake.auth.playerId;
  if (!playerId || typeof playerId !== 'string') {
    return next(new Error('Missing playerId'));
  }
  socket.data.playerId = playerId;
  socket.data.roomId = null;
  next();
});

// In production, serve Vite-built SPA
if (config.nodeEnv === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Register socket event handlers
registerSocketHandlers(io);

httpServer.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
});
