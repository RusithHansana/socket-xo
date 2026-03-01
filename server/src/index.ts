import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import { registerSocketHandlers } from './socket-handler';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
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
