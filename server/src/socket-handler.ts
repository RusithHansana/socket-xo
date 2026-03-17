import { Server, type Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';
import type {
  ClientToServerEvents,
  PlayerSession,
  PlayerInfo,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from 'shared';
import { cleanupAiGame, handleAiMove, isAiGame, startAiGame } from './game/ai-game-handler.js';
import { applyMove, validateMove } from './game/game-engine.js';
import { addToQueue, removeFromQueue, tryMatchPair } from './matchmaking/matchmaking.js';
import {
  addPlayerToRoom,
  createRoom,
  createWaitingRoom,
  getGameState,
  getRoom,
  getRoomByPlayerId,
  markRoomCompleted,
  updateRoomState,
} from './room/room-manager.js';
import { appendChatMessage, clearChatHistory } from './chat/chat-handler.js';
import { cancelGraceTimer, startGraceTimer } from './room/grace-timer.js';
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
import { config } from './config.js';
import { encodeHtml } from './utils/html-encode.js';
import { logger } from './utils/logger.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

type MatchedPlayer = {
  session: PlayerSession;
  socket: AppSocket;
};

const RECONNECT_RECOVERY_TARGET_MS = 2_000;
const disconnectStartedAtMs = new Map<string, number>();

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

    const player1ReconnectToken = issueReconnectToken(player1.session.playerId, room.roomId);
    const player2ReconnectToken = issueReconnectToken(player2.session.playerId, room.roomId);

    io.to(room.roomId).emit('game_start', room.state);

    if (player1ReconnectToken !== null) {
      player1.socket.emit('reconnect_token', { reconnectToken: player1ReconnectToken });
    }

    if (player2ReconnectToken !== null) {
      player2.socket.emit('reconnect_token', { reconnectToken: player2ReconnectToken });
    }

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
          clearChatHistory(payload.roomId);

          for (const playerId of room.playerIds) {
            clearReconnectToken(playerId);
            disconnectStartedAtMs.delete(playerId);
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
        if (
          payload === null
          || typeof payload !== 'object'
          || typeof payload.roomId !== 'string'
          || typeof payload.content !== 'string'
        ) {
          socket.emit('error', {
            code: 'INVALID_PAYLOAD',
            message: 'Chat payload is invalid or missing required fields.',
          });
          return;
        }

        const trimmedContent = payload.content.trim();
        if (trimmedContent.length === 0) {
          socket.emit('error', {
            code: 'INVALID_PAYLOAD',
            message: 'Chat message content cannot be empty.',
          });
          return;
        }

        const room = getRoom(payload.roomId);

        if (room === null) {
          socket.emit('error', {
            code: 'ROOM_NOT_FOUND',
            message: `Room ${payload.roomId} was not found.`,
          });
          return;
        }

        if (room.status === 'completed' || room.state.phase !== 'playing') {
          socket.emit('error', {
            code: 'GAME_ENDED',
            message: 'Cannot send chat messages because this game is not active.',
          });
          return;
        }

        const sender = room.state.players.find((player) => player.playerId === socket.data.playerId);

        if (sender === undefined) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'Player is not a member of the specified room.',
          });
          return;
        }

        const message = {
          id: randomUUID(),
          playerId: sender.playerId,
          displayName: sender.displayName,
          content: encodeHtml(trimmedContent),
          timestamp: Date.now(),
        };

        const nextChatHistory = appendChatMessage(room.roomId, message);

        updateRoomState(room.roomId, {
          ...room.state,
          chatMessages: nextChatHistory,
        });

        io.to(room.roomId).emit('chat_message', message);

        logger.debug(
          { playerId: socket.data.playerId, roomId: payload.roomId, messageId: message.id },
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

    socket.on('create_room', async () => {
      try {
        const existingRoom = getRoomByPlayerId(socket.data.playerId);
        if (existingRoom !== null && existingRoom.status !== 'completed') {
          socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'You are already in an active game.' });
          return;
        }

        removeFromQueue(socket.data.playerId);

        const room = createWaitingRoom(
          socket.data.playerId,
          createOnlinePlayerInfo(socket, socket.data.playerId),
        );

        await socket.join(room.roomId);
        socket.data.roomId = room.roomId;

        const reconnectToken = issueReconnectToken(socket.data.playerId, room.roomId);
        if (reconnectToken !== null) {
          socket.emit('reconnect_token', { reconnectToken });
        }

        socket.emit('room_created', { roomId: room.roomId });
        socket.emit('game_state_update', room.state);

        logger.debug(
          { playerId: socket.data.playerId, roomId: room.roomId },
          'create_room received',
        );
      } catch (err) {
        logger.error(
          {
            err: err instanceof Error ? err : new Error(String(err)),
            playerId: socket.data.playerId,
          },
          'Error handling create_room',
        );
        socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
      }
    });

    socket.on('reconnect_attempt', async (payload) => {
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

        if (reboundSession.roomId === null || reboundSession.roomId.startsWith('ai-')) {
          socket.emit('reconnect_failed', {
            code: 'GAME_ENDED',
            message: 'The game has already ended.',
          });
          clearReconnectToken(payload.playerId);
          disconnectStartedAtMs.delete(payload.playerId);
          socket.data.roomId = null;
          return;
        }

        const room = getRoom(reboundSession.roomId);

        if (room === null || room.status !== 'active') {
          socket.emit('reconnect_failed', {
            code: 'GAME_ENDED',
            message: 'The game has already ended.',
          });
          clearReconnectToken(payload.playerId);
          disconnectStartedAtMs.delete(payload.playerId);
          socket.data.roomId = null;
          return;
        }

        clearReconnectToken(payload.playerId);
        socket.data.roomId = reboundSession.roomId;
        await socket.join(reboundSession.roomId);

        const updatedState = {
          ...room.state,
          players: room.state.players.map((player) =>
            player.playerId === payload.playerId
              ? { ...player, connected: true }
              : player,
          ),
        };

        updateRoomState(reboundSession.roomId, updatedState);

        const roomState = getGameState(reboundSession.roomId);

        if (roomState === null) {
          socket.emit('reconnect_failed', {
            code: 'GAME_ENDED',
            message: 'The game has already ended.',
          });
          disconnectStartedAtMs.delete(payload.playerId);
          socket.data.roomId = null;
          return;
        }

        cancelGraceTimer(payload.playerId);
        io.to(reboundSession.roomId).emit('game_state_update', updatedState);
        io.to(reboundSession.roomId).emit('player_reconnected', { playerId: payload.playerId });

        socket.emit('reconnect_success', roomState);

        const newReconnectToken = issueReconnectToken(payload.playerId, reboundSession.roomId);
        if (newReconnectToken !== null) {
          socket.emit('reconnect_token', { reconnectToken: newReconnectToken });
        }

        const disconnectStartedAt = disconnectStartedAtMs.get(payload.playerId);
        const reconnectLatencyMs =
          disconnectStartedAt === undefined ? null : Math.max(0, Date.now() - disconnectStartedAt);
        const recoveryTargetMet =
          reconnectLatencyMs === null ? null : reconnectLatencyMs <= RECONNECT_RECOVERY_TARGET_MS;
        disconnectStartedAtMs.delete(payload.playerId);

        logger.debug(
          {
            playerId: payload.playerId,
            socketId: socket.id,
            roomId: reboundSession.roomId,
            reconnectLatencyMs,
            reconnectLatencyTargetMs: RECONNECT_RECOVERY_TARGET_MS,
            recoveryTargetMet,
          },
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

    socket.on('join_room', async (payload) => {
      try {
        if (
          payload === null
          || typeof payload !== 'object'
          || typeof payload.roomId !== 'string'
          || typeof payload.playerId !== 'string'
        ) {
          socket.emit('error', {
            code: 'INVALID_PAYLOAD',
            message: 'Join room payload is invalid or missing required fields.',
          });
          return;
        }

        if (payload.playerId !== socket.data.playerId) {
          socket.emit('error', {
            code: 'INVALID_PAYLOAD',
            message: 'Join room payload playerId must match current session player.',
          });
          return;
        }

        const room = getRoom(payload.roomId);

        if (room === null) {
          socket.emit('error', {
            code: 'ROOM_NOT_FOUND',
            message: `Room ${payload.roomId} was not found.`,
          });
          return;
        }

        if (room.playerIds.includes(payload.playerId)) {
          socket.emit('error', {
            code: 'ALREADY_IN_ROOM',
            message: `Player ${payload.playerId} is already in room ${payload.roomId}.`,
          });
          return;
        }

        if (room.status === 'completed') {
          socket.emit('error', { code: 'GAME_ENDED', message: 'This game has already ended.' });
          return;
        }

        const existingRoom = getRoomByPlayerId(socket.data.playerId);
        if (
          existingRoom !== null
          && existingRoom.status !== 'completed'
          && existingRoom.roomId !== payload.roomId
        ) {
          socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'You are already in an active game.' });
          return;
        }

        const addResult = addPlayerToRoom(
          payload.roomId,
          payload.playerId,
          createOnlinePlayerInfo(socket, payload.playerId),
        );

        if (!addResult.success) {
          socket.emit('error', {
            code: addResult.error.code,
            message: addResult.error.message,
          });
          return;
        }

        await socket.join(payload.roomId);
        socket.data.roomId = payload.roomId;

        const joinerReconnectToken = issueReconnectToken(payload.playerId, payload.roomId);
        if (joinerReconnectToken !== null) {
          socket.emit('reconnect_token', { reconnectToken: joinerReconnectToken });
        }

        if (addResult.room.playerIds.length === 2) {
          const playingState = {
            ...addResult.room.state,
            phase: 'playing' as const,
          };

          const updatedRoom = updateRoomState(payload.roomId, playingState);
          io.to(payload.roomId).emit('game_start', updatedRoom?.state ?? playingState);

          for (const playerId of addResult.room.playerIds) {
            if (playerId === payload.playerId) {
              continue;
            }

            const token = issueReconnectToken(playerId, payload.roomId);
            const session = getSession(playerId);
            if (token !== null && session !== null && session.socketId !== null) {
              io.sockets.sockets.get(session.socketId)?.emit('reconnect_token', { reconnectToken: token });
            }
          }
        }

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

        if (session !== null && session.roomId !== null) {
          const room = getRoomByPlayerId(session.playerId);

          if (
            room !== null
            && room.roomId === session.roomId
            && room.status === 'active'
            && !room.roomId.startsWith('ai-')
          ) {
            const disconnectedState = {
              ...room.state,
              players: room.state.players.map((player) =>
                player.playerId === session.playerId
                  ? { ...player, connected: false }
                  : player,
              ),
            };

            updateRoomState(room.roomId, disconnectedState);
            io.to(room.roomId).emit('game_state_update', disconnectedState);
            io.to(room.roomId).emit('player_disconnected', {
              playerId: session.playerId,
              gracePeriodMs: config.gracePeriodMs,
            });

            disconnectStartedAtMs.set(session.playerId, Date.now());

            startGraceTimer(session.playerId, config.gracePeriodMs, () => {
              try {
                const activeRoom = getRoom(room.roomId);

                if (activeRoom === null || activeRoom.status !== 'active') {
                  return;
                }

                const remainingConnectedPlayer = activeRoom.state.players.find((player) => player.connected);
                const outcome = remainingConnectedPlayer === undefined
                  ? { type: 'draw' as const, winner: null, winningLine: null }
                  : {
                      type: 'forfeit' as const,
                      winner: remainingConnectedPlayer.symbol,
                      winningLine: null,
                    };

                const finalState = {
                  ...activeRoom.state,
                  phase: 'finished' as const,
                  outcome,
                };

                updateRoomState(activeRoom.roomId, finalState);
                io.to(activeRoom.roomId).emit('game_over', finalState);
                markRoomCompleted(activeRoom.roomId);
                clearChatHistory(activeRoom.roomId);

                for (const playerId of activeRoom.playerIds) {
                  clearReconnectToken(playerId);
                  disconnectStartedAtMs.delete(playerId);
                }
              } catch (err) {
                logger.error(
                  {
                    err: err instanceof Error ? err : new Error(String(err)),
                    playerId: session.playerId,
                    roomId: room.roomId,
                  },
                  'Error resolving grace period expiry',
                );
              }
            });
          }
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
