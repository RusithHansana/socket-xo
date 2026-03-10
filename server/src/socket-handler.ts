import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from 'shared';
import { cleanupAiGame, handleAiMove, isAiGame, startAiGame } from './game/ai-game-handler.js';
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

    socket.on('start_ai_game', () => {
      try {
        const displayName =
          typeof socket.handshake.auth.displayName === 'string'
            ? socket.handshake.auth.displayName
            : `Player-${socket.data.playerId.slice(0, 4)}`;
        const avatarUrl =
          typeof socket.handshake.auth.avatarUrl === 'string'
            ? socket.handshake.auth.avatarUrl
            : `https://robohash.org/${socket.data.playerId}`;
        const result = startAiGame(
          socket.id,
          socket.data.playerId,
          displayName,
          avatarUrl,
        );

        if (result.error !== null || result.state === null) {
          socket.emit('error', result.error ?? {
            code: 'AI_GAME_START_FAILED',
            message: 'Unable to start AI game.',
          });
          return;
        }

        socket.data.roomId = result.state.roomId;
        socket.emit('game_start', result.state);
      } catch (err) {
        logger.error(
          {
            err: err instanceof Error ? err : new Error(String(err)),
            playerId: socket.data.playerId,
          },
          'Error handling start_ai_game',
        );
        socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
      }
    });

    socket.on('make_move', (payload) => {
      try {
        if (!payload || typeof payload !== 'object' || typeof payload.roomId !== 'string') {
          socket.emit('move_rejected', {
            code: 'INVALID_PAYLOAD',
            message: 'Move payload is invalid.',
          });
          return;
        }

        if (isAiGame(socket.id)) {
          if (payload.roomId !== socket.data.roomId) {
            socket.emit('move_rejected', {
              code: 'ROOM_MISMATCH',
              message: 'Move payload does not match the active AI game.',
            });
            return;
          }

          const result = handleAiMove(socket.id, payload.position);

          if (result.error !== null) {
            socket.emit('move_rejected', result.error);
            return;
          }

          if (result.playerState !== null) {
            socket.emit('game_state_update', result.playerState);

            if (result.playerState.phase === 'finished' || result.playerState.outcome !== null) {
              socket.data.roomId = null;
              socket.emit('game_over', result.playerState);
              return;
            }
          }

          if (result.aiState !== null) {
            setTimeout(() => {
              if (result.aiState !== null) {
                socket.emit('game_state_update', result.aiState);
    
                if (result.aiState.phase === 'finished' || result.aiState.outcome !== null) {
                  socket.data.roomId = null;
                  socket.emit('game_over', result.aiState);
                }
              }
            }, 600);
          }

          return;
        }

        if (typeof payload?.roomId === 'string' && payload.roomId.startsWith('ai-')) {
          socket.emit('move_rejected', {
            code: 'GAME_OVER',
            message: 'This AI game has already finished or does not exist.',
          });
          return;
        }

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
      const cleanupResult = cleanupAiGame(socket.id);
      if (cleanupResult.error !== null) {
        logger.error(
          {
            socketId: socket.id,
            playerId: socket.data.playerId,
            cleanupError: cleanupResult.error,
          },
          'Error cleaning up AI game state on disconnect',
        );
      }

      logger.debug(
        { socketId: socket.id, playerId: socket.data.playerId, reason },
        'Client disconnected',
      );
    });
  });
}
