import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  GameState,
  PlayerInfo,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from 'shared';
import { BOARD_SIZE } from 'shared';
import { cleanupAiGame, handleAiMove, isAiGame, startAiGame } from './game/ai-game-handler.js';
import {
  clearReconnectToken,
  getSession,
  markDisconnected,
  rebindSession,
  registerSession,
  setSessionSocketDisconnectHandler,
  validateReconnectToken,
} from './session/session-manager.js';
import { logger } from './utils/logger.js';

function createReconnectPlaceholderState(playerId: string, roomId: string): GameState {
  const player: PlayerInfo = {
    playerId,
    displayName: 'Reconnected Player',
    avatarUrl: `https://robohash.org/${playerId}`,
    symbol: 'X',
    connected: true,
  };

  return {
    roomId,
    board: Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null)),
    currentTurn: 'X',
    players: [player],
    phase: 'waiting',
    outcome: null,
    moveCount: 0,
  };
}

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
): void {
  setSessionSocketDisconnectHandler((socketId) => {
    const existingSocket = io.sockets.sockets.get(socketId);
    existingSocket?.disconnect(true);
  });

  io.on('connection', (socket) => {
    try {
      registerSession(socket.data.playerId, socket.id);
      logger.debug({ socketId: socket.id, playerId: socket.data.playerId }, 'Client connected');
    } catch (err) {
      logger.error(
        {
          err: err instanceof Error ? err : new Error(String(err)),
          playerId: socket.data.playerId,
          socketId: socket.id,
        },
        'Error registering session on connect',
      );
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
      socket.disconnect(true);
      return;
    }

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
            }, 150);
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
        const session = validateReconnectToken(payload.playerId, payload.reconnectToken);

        if (session === null) {
          const existingSession = getSession(payload.playerId);

          socket.emit('reconnect_failed', existingSession === null
            ? {
                code: 'SESSION_NOT_FOUND',
                message: 'No reconnectable session was found for this player.',
              }
            : {
                code: 'INVALID_TOKEN',
                message: 'The reconnect token is invalid for this player session.',
              });
          return;
        }

        const reboundSession = rebindSession(payload.playerId, socket.id);

        if (reboundSession === null) {
          socket.emit('reconnect_failed', {
            code: 'SESSION_NOT_FOUND',
            message: 'No reconnectable session was found for this player.',
          });
          return;
        }

        clearReconnectToken(payload.playerId);
        socket.data.roomId = reboundSession.roomId;

        socket.emit(
          'reconnect_success',
          createReconnectPlaceholderState(
            session.playerId,
            reboundSession.roomId ?? `reconnect-${session.playerId}`,
          ),
        );

        logger.debug(
          { playerId: payload.playerId, socketId: socket.id, roomId: reboundSession.roomId },
          'reconnect_attempt succeeded',
        );
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
      try {
        const session = markDisconnected(socket.id);
        logger.debug(
          {
            socketId: socket.id,
            playerId: socket.data.playerId,
            roomId: session?.roomId ?? null,
            connected: session?.connected ?? false,
          },
          'Session marked disconnected',
        );

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
      } catch (err) {
        logger.error(
          {
            err: err instanceof Error ? err : new Error(String(err)),
            playerId: socket.data.playerId,
            socketId: socket.id,
          },
          'Error handling disconnect',
        );
      }
    });
  });
}
