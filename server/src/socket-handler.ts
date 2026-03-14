import { Server, type Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  GameState,
  PlayerSession,
  PlayerInfo,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from 'shared';
import { BOARD_SIZE } from 'shared';
import { cleanupAiGame, handleAiMove, isAiGame, startAiGame } from './game/ai-game-handler.js';
import { applyMove, validateMove } from './game/game-engine.js';
import { addToQueue, removeFromQueue, tryMatchPair } from './matchmaking/matchmaking.js';
import {
  createRoom,
  getRoom,
  getRoomByPlayerId,
  markRoomCompleted,
  updateRoomState,
} from './room/room-manager.js';
import {
  clearReconnectToken,
  getSession,
  issueReconnectToken,
  markDisconnected,
  rebindSession,
  registerSession,
  setSessionSocketDisconnectHandler,
  validateReconnectToken,
} from './session/session-manager.js';
import { logger } from './utils/logger.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

type MatchedPlayer = {
  session: PlayerSession;
  socket: AppSocket;
};

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

function createOnlinePlayerInfo(socket: AppSocket, playerId: string): PlayerInfo {
  const displayName =
    typeof socket.handshake.auth.displayName === 'string'
      ? socket.handshake.auth.displayName
      : `Player-${playerId.slice(0, 4)}`;
  const avatarUrl =
    typeof socket.handshake.auth.avatarUrl === 'string'
      ? socket.handshake.auth.avatarUrl
      : `https://robohash.org/${playerId}`;

  return {
    playerId,
    displayName,
    avatarUrl,
    symbol: 'X',
    connected: true,
  };
}

function resolveMatchedPlayer(io: AppServer, playerId: string): MatchedPlayer | null {
  const session = getSession(playerId);

  if (session === null || session.socketId === null) {
    return null;
  }

  const socket = io.sockets.sockets.get(session.socketId);

  if (socket === undefined) {
    return null;
  }

  return { session, socket };
}

async function handleMatchedPair(io: AppServer, initialPair: [string, string]): Promise<void> {
  let currentPair: [string, string] | null = initialPair;

  while (currentPair !== null) {
    const [player1Id, player2Id] = currentPair;
    const player1 = resolveMatchedPlayer(io, player1Id);
    const player2 = resolveMatchedPlayer(io, player2Id);

    if (player1 === null || player2 === null) {
      if (player1 !== null) {
        addToQueue(player1Id, true);
      }

      if (player2 !== null) {
        addToQueue(player2Id, true);
      }

      logger.debug(
        {
          player1Id,
          player2Id,
          player1Available: player1 !== null,
          player2Available: player2 !== null,
        },
        'Aborted matchmaking pair because one or more queued players went stale',
      );
      
      currentPair = tryMatchPair();
      continue;
    }

    const room = createRoom(
      player1Id,
      player2Id,
      createOnlinePlayerInfo(player1.socket, player1Id),
      createOnlinePlayerInfo(player2.socket, player2Id),
    );

    await Promise.all([player1.socket.join(room.roomId), player2.socket.join(room.roomId)]);

    player1.socket.data.roomId = room.roomId;
    player2.socket.data.roomId = room.roomId;

    issueReconnectToken(player1.session.playerId, room.roomId);
    issueReconnectToken(player2.session.playerId, room.roomId);

    io.to(room.roomId).emit('game_start', room.state);

    logger.debug(
      { roomId: room.roomId, player1Id, player2Id },
      'Matched queued players and started an online game',
    );
    break;
  }
}

export function registerSocketHandlers(
  io: AppServer,
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

    socket.on('join_queue', async () => {
      try {
        const existingRoom = getRoomByPlayerId(socket.data.playerId);
        if (existingRoom !== null && existingRoom.status !== 'completed') {
          socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'You are already in an active game.' });
          return;
        }

        const addedToQueue = addToQueue(socket.data.playerId);

        socket.emit('queue_joined');

        const pair = tryMatchPair();

        if (pair !== null) {
          await handleMatchedPair(io, pair);
        }

        logger.debug(
          { playerId: socket.data.playerId, addedToQueue, matched: pair !== null },
          'join_queue received',
        );
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
        const removedFromQueue = removeFromQueue(socket.data.playerId);

        logger.debug({ playerId: socket.data.playerId, removedFromQueue }, 'leave_queue received');
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

        const room = getRoom(payload.roomId);

        if (room === null) {
          socket.emit('move_rejected', {
            code: 'ROOM_NOT_FOUND',
            message: `Room ${payload.roomId} was not found.`,
          });
          return;
        }

        const currentPlayer = room.state.players.find(
          (player) => player.playerId === socket.data.playerId,
        );

        if (currentPlayer === undefined) {
          socket.emit('move_rejected', {
            code: 'NOT_IN_ROOM',
            message: 'Player is not a member of the specified room.',
          });
          return;
        }

        const validationResult = validateMove(room.state, payload.position, currentPlayer.symbol);

        if (!validationResult.valid) {
          socket.emit('move_rejected', {
            code: validationResult.code,
            message: validationResult.message,
          });
          return;
        }

        const nextState = applyMove(room.state, payload.position, currentPlayer.symbol);
        updateRoomState(payload.roomId, nextState);
        io.to(payload.roomId).emit('game_state_update', nextState);

        if (nextState.phase === 'finished') {
          io.to(payload.roomId).emit('game_over', nextState);
          markRoomCompleted(payload.roomId);

          for (const playerId of room.playerIds) {
            clearReconnectToken(playerId);
          }
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
        if (!payload || typeof payload !== 'object' || typeof payload.playerId !== 'string' || typeof payload.reconnectToken !== 'string') {
          socket.emit('reconnect_failed', {
            code: 'INVALID_PAYLOAD',
            message: 'Reconnect payload is invalid or missing required fields.',
          });
          return;
        }

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
        const removedFromQueue = removeFromQueue(socket.data.playerId);
        const session = markDisconnected(socket.id);
        logger.debug(
          {
            socketId: socket.id,
            playerId: socket.data.playerId,
            roomId: session?.roomId ?? null,
            connected: session?.connected ?? false,
            removedFromQueue,
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
