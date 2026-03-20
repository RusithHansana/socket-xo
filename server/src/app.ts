import express from 'express';
import { createServer, type Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from 'shared';
import { registerSocketHandlers } from './socket-handler.js';
import { startRoomSweep, stopRoomSweep, clearAllRooms } from './room/room-manager.js';
import { clearAllGraceTimers } from './room/grace-timer.js';
import { clearAllSessions } from './session/session-manager.js';
import { config } from './config.js';

export type AppInstance = {
  httpServer: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  start: (port?: number) => Promise<number>;
  stop: () => Promise<void>;
};

export function createApp(options?: {
  corsOrigin?: string;
  cleanupIntervalMs?: number;
}): AppInstance {
  const corsOrigin = options?.corsOrigin ?? config.corsOrigin;
  const cleanupIntervalMs = options?.cleanupIntervalMs ?? 0;

  const app = express();
  const httpServer = createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
      },
    },
  );

  io.use((socket, next) => {
    const playerId = socket.handshake.auth.playerId;
    if (typeof playerId !== 'string' || playerId.trim() === '') {
      return next(new Error('Missing playerId'));
    }
    socket.data.playerId = playerId;
    socket.data.roomId = null;
    next();
  });

  registerSocketHandlers(io);

  if (cleanupIntervalMs > 0) {
    startRoomSweep({ intervalMs: cleanupIntervalMs });
  }

  function start(port = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      httpServer.listen(port, () => {
        const addr = httpServer.address();
        if (addr === null || typeof addr === 'string') {
          reject(new Error('Failed to get server address'));
          return;
        }
        resolve(addr.port);
      });
      httpServer.on('error', reject);
    });
  }

  async function stop(): Promise<void> {
    stopRoomSweep();

    // Disconnect all sockets
    for (const socket of io.sockets.sockets.values()) {
      socket.disconnect(true);
    }

    await new Promise<void>((resolve, reject) => {
      io.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Clean up all state in test mode
    if (process.env.NODE_ENV === 'test') {
      clearAllRooms();
      clearAllSessions();
      clearAllGraceTimers();
    }
  }

  return { httpServer, io, start, stop };
}
