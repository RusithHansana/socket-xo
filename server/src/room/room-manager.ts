import { randomUUID } from 'node:crypto';
import { MAX_PLAYERS_PER_ROOM, type GameState, type PlayerInfo } from 'shared';
import { createGame } from '../game/game-engine.js';
import { logger } from '../utils/logger.js';
import type { GameRoom } from './room.types.js';

type RoomError = {
  code: string;
  message: string;
};

type AddPlayerToRoomResult =
  | { success: true; room: GameRoom }
  | { success: false; error: RoomError };

const rooms = new Map<string, GameRoom>();
const roomRemovalTimers = new Map<string, ReturnType<typeof setTimeout>>();

let roomSweepInterval: ReturnType<typeof setInterval> | null = null;

export const ROOM_COMPLETION_CLEANUP_DELAY_MS = 5_000;
export const ROOM_ORPHAN_MAX_AGE_MS = 10 * 60 * 1_000;

type RoomRemovalReason = 'completed' | 'abandoned';

type RoomSweepOptions = {
  orphanAgeMs?: number;
  nowMs?: number;
};

type RoomSweepLifecycleOptions = {
  intervalMs: number;
  orphanAgeMs?: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    board: state.board.map((row) => [...row]),
    players: state.players.map((player) => ({ ...player })),
    outcome:
      state.outcome === null
        ? null
        : {
            ...state.outcome,
            winningLine:
              state.outcome.winningLine === null
                ? null
                : state.outcome.winningLine.map((position) => ({ ...position })),
          },
    chatMessages: (state.chatMessages ?? []).map((message) => ({ ...message })),
  };
}

function cloneRoom(room: GameRoom): GameRoom {
  return {
    ...room,
    playerIds: [...room.playerIds],
    state: cloneGameState(room.state),
  };
}

function assignSymbols(player1Info: PlayerInfo, player2Info: PlayerInfo): PlayerInfo[] {
  if (Math.random() < 0.5) {
    return [
      { ...player1Info, symbol: 'X' },
      { ...player2Info, symbol: 'O' },
    ];
  }

  return [
    { ...player1Info, symbol: 'O' },
    { ...player2Info, symbol: 'X' },
  ];
}

function getStoredRoom(roomId: string): GameRoom | null {
  return rooms.get(roomId) ?? null;
}

function createError(code: string, message: string): RoomError {
  return { code, message };
}

export function createRoom(
  player1Id: string,
  player2Id: string,
  player1Info: PlayerInfo,
  player2Info: PlayerInfo,
): GameRoom {
  if (player1Id === player2Id) {
    throw new Error('Cannot create a room with duplicate player IDs.');
  }

  const roomId = randomUUID();
  const players = assignSymbols(player1Info, player2Info);
  const createdAt = nowIso();
  const room: GameRoom = {
    roomId,
    playerIds: [player1Id, player2Id],
    state: createGame(roomId, players),
    createdAt,
    status: 'active',
    completedAt: null,
    abandonedAt: null,
    lastActivityAt: createdAt,
  };

  rooms.set(roomId, room);
  return cloneRoom(room);
}

export function createWaitingRoom(playerId: string, playerInfo: PlayerInfo): GameRoom {
  if (playerId !== playerInfo.playerId) {
    throw new Error(`Player ID mismatch: ${playerId} !== ${playerInfo.playerId}`);
  }

  const roomId = randomUUID();
  const createdAt = nowIso();
  const room: GameRoom = {
    roomId,
    playerIds: [playerId],
    state: {
      roomId,
      board: [
        [null, null, null],
        [null, null, null],
        [null, null, null],
      ],
      currentTurn: 'X',
      players: [{ ...playerInfo, symbol: 'X' }],
      phase: 'waiting',
      outcome: null,
      moveCount: 0,
      chatMessages: [],
    },
    createdAt,
    status: 'waiting',
    completedAt: null,
    abandonedAt: null,
    lastActivityAt: createdAt,
  };

  rooms.set(roomId, room);
  return cloneRoom(room);
}

export function getRoom(roomId: string): GameRoom | null {
  const room = getStoredRoom(roomId);

  return room === null ? null : cloneRoom(room);
}

export function getRoomByPlayerId(playerId: string): GameRoom | null {
  let foundCompletedRoom: GameRoom | null = null;

  for (const room of rooms.values()) {
    if (room.playerIds.includes(playerId)) {
      if (room.status !== 'completed') {
        return cloneRoom(room);
      }
      foundCompletedRoom = cloneRoom(room);
    }
  }

  return foundCompletedRoom;
}

export function addPlayerToRoom(
  roomId: string,
  playerId: string,
  playerInfo: PlayerInfo,
): AddPlayerToRoomResult {
  if (playerId !== playerInfo.playerId) {
    return {
      success: false,
      error: createError('INVALID_PLAYER_ID', `Player ID mismatch: ${playerId} !== ${playerInfo.playerId}`),
    };
  }

  const room = getStoredRoom(roomId);

  if (room === null) {
    return {
      success: false,
      error: createError('ROOM_NOT_FOUND', `Room ${roomId} was not found.`),
    };
  }

  if (room.playerIds.includes(playerId)) {
    return {
      success: false,
      error: createError('ALREADY_IN_ROOM', `Player ${playerId} is already in room ${roomId}.`),
    };
  }

  if (room.status === 'completed') {
    return {
      success: false,
      error: createError('GAME_ENDED', `Game in room ${roomId} has already ended.`),
    };
  }

  if (room.playerIds.length >= MAX_PLAYERS_PER_ROOM) {
    return {
      success: false,
      error: createError('ROOM_FULL', `Room ${roomId} already has ${MAX_PLAYERS_PER_ROOM} players.`),
    };
  }

  const existingSymbol = room.state.players[0]?.symbol;
  const nextSymbol = existingSymbol === 'X' ? 'O' : 'X';

  const nextPlayerIds = [...room.playerIds, playerId];
  const nextState: GameState = {
    ...room.state,
    players: [...room.state.players, { ...playerInfo, symbol: nextSymbol }],
    phase: nextPlayerIds.length === MAX_PLAYERS_PER_ROOM ? 'playing' : room.state.phase,
  };

  const updatedRoom: GameRoom = {
    ...room,
    playerIds: nextPlayerIds,
    state: nextState,
    status:
      nextState.phase === 'finished'
        ? 'completed'
        : nextPlayerIds.length < MAX_PLAYERS_PER_ROOM
          ? 'waiting'
          : 'active',
  };

  rooms.set(roomId, updatedRoom);

  return {
    success: true,
    room: cloneRoom(updatedRoom),
  };
}

export function updateRoomState(roomId: string, newState: GameState): GameRoom | null {
  const room = getStoredRoom(roomId);

  if (room === null) {
    return null;
  }

  const nextStatus =
    newState.phase === 'finished'
      ? 'completed'
      : room.playerIds.length < MAX_PLAYERS_PER_ROOM || newState.phase === 'waiting'
        ? 'waiting'
        : 'active';

  const completedAt = nextStatus === 'completed' ? room.completedAt ?? nowIso() : null;

  const updatedRoom: GameRoom = {
    ...room,
    state: cloneGameState(newState),
    status: nextStatus,
    completedAt,
    abandonedAt: nextStatus === 'completed' ? room.abandonedAt : null,
    lastActivityAt: nowIso(),
  };

  rooms.set(roomId, updatedRoom);
  return cloneRoom(updatedRoom);
}

export function getGameState(roomId: string): GameState | null {
  const room = getStoredRoom(roomId);

  return room === null ? null : cloneGameState(room.state);
}

export function markRoomCompleted(roomId: string): GameRoom | null {
  const room = getStoredRoom(roomId);

  if (room === null) {
    return null;
  }

  const completedAt = room.completedAt ?? nowIso();
  const updatedRoom: GameRoom = {
    ...room,
    status: 'completed',
    completedAt,
    abandonedAt: null,
    lastActivityAt: completedAt,
  };

  rooms.set(roomId, updatedRoom);
  scheduleRoomRemoval(roomId, ROOM_COMPLETION_CLEANUP_DELAY_MS, 'completed');
  return cloneRoom(updatedRoom);
}

export function markRoomAbandoned(roomId: string): GameRoom | null {
  const room = getStoredRoom(roomId);

  if (room === null) {
    return null;
  }

  const abandonedAt = room.abandonedAt ?? nowIso();
  const updatedRoom: GameRoom = {
    ...room,
    abandonedAt,
    lastActivityAt: abandonedAt,
  };

  rooms.set(roomId, updatedRoom);
  return cloneRoom(updatedRoom);
}

export function scheduleRoomRemoval(
  roomId: string,
  delayMs: number,
  reason: RoomRemovalReason,
): boolean {
  const room = getStoredRoom(roomId);

  if (room === null) {
    return false;
  }

  const existingTimer = roomRemovalTimers.get(roomId);
  if (existingTimer !== undefined) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    removeRoom(roomId);
    logger.info(
      {
        roomId,
        reason,
        ageMs: Date.now() - Date.parse(room.createdAt),
      },
      'Removed room from memory',
    );
  }, delayMs);

  roomRemovalTimers.set(roomId, timer);
  return true;
}

export function runRoomSweepOnce(options: RoomSweepOptions = {}): number {
  const nowMs = options.nowMs ?? Date.now();
  const orphanAgeMs = options.orphanAgeMs ?? ROOM_ORPHAN_MAX_AGE_MS;
  const roomsToRemove: Array<{ roomId: string; reason: 'abandoned' | 'completed'; ageMs: number }> = [];

  for (const room of rooms.values()) {
    const abandonedAtMs = room.abandonedAt === null ? null : Date.parse(room.abandonedAt);
    const completedAtMs = room.completedAt === null ? null : Date.parse(room.completedAt);

    if (abandonedAtMs !== null) {
      const ageMs = nowMs - abandonedAtMs;
      if (ageMs >= orphanAgeMs) {
        roomsToRemove.push({ roomId: room.roomId, reason: 'abandoned', ageMs });
      }
      continue;
    }

    if (room.status === 'completed' && completedAtMs !== null) {
      const ageMs = nowMs - completedAtMs;
      if (ageMs >= orphanAgeMs) {
        roomsToRemove.push({ roomId: room.roomId, reason: 'completed', ageMs });
      }
    }
  }

  for (const room of roomsToRemove) {
    removeRoom(room.roomId);
    logger.info(
      {
        roomId: room.roomId,
        reason: room.reason,
        ageMs: room.ageMs,
      },
      'Removed orphaned room during periodic sweep',
    );
  }

  return roomsToRemove.length;
}

export function startRoomSweep(options: RoomSweepLifecycleOptions): void {
  stopRoomSweep();

  const orphanAgeMs = options.orphanAgeMs ?? ROOM_ORPHAN_MAX_AGE_MS;
  roomSweepInterval = setInterval(() => {
    runRoomSweepOnce({ orphanAgeMs });
  }, options.intervalMs);
}

export function stopRoomSweep(): void {
  if (roomSweepInterval !== null) {
    clearInterval(roomSweepInterval);
    roomSweepInterval = null;
  }
}

export function removeRoom(roomId: string): boolean {
  const timer = roomRemovalTimers.get(roomId);
  if (timer !== undefined) {
    clearTimeout(timer);
    roomRemovalTimers.delete(roomId);
  }

  return rooms.delete(roomId);
}

export function getCompletedRooms(): GameRoom[] {
  return Array.from(rooms.values())
    .filter((room) => room.status === 'completed')
    .map((room) => cloneRoom(room));
}

export function getAllRooms(): GameRoom[] {
  return Array.from(rooms.values()).map((room) => cloneRoom(room));
}

export function clearAllRooms(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearAllRooms is a test-only helper and cannot be used in production.');
  }
  for (const timer of roomRemovalTimers.values()) {
    clearTimeout(timer);
  }
  roomRemovalTimers.clear();
  stopRoomSweep();
  rooms.clear();
}