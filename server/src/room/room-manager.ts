import { randomUUID } from 'node:crypto';
import { MAX_PLAYERS_PER_ROOM, type GameState, type PlayerInfo } from 'shared';
import { createGame } from '../game/game-engine.js';
import type { GameRoom } from './room.types.js';

type RoomError = {
  code: string;
  message: string;
};

type AddPlayerToRoomResult =
  | { success: true; room: GameRoom }
  | { success: false; error: RoomError };

const rooms = new Map<string, GameRoom>();

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
  const room: GameRoom = {
    roomId,
    playerIds: [player1Id, player2Id],
    state: createGame(roomId, players),
    createdAt: new Date().toISOString(),
    status: 'active',
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

  if (room.playerIds.length >= MAX_PLAYERS_PER_ROOM) {
    return {
      success: false,
      error: createError('ROOM_FULL', `Room ${roomId} already has ${MAX_PLAYERS_PER_ROOM} players.`),
    };
  }

  const existingSymbol = room.state.players[0]?.symbol;
  const nextSymbol = existingSymbol === 'X' ? 'O' : 'X';

  const updatedRoom: GameRoom = {
    ...room,
    playerIds: [...room.playerIds, playerId],
    state: {
      ...room.state,
      players: [...room.state.players, { ...playerInfo, symbol: nextSymbol }],
    },
    status: room.state.phase === 'finished' ? 'completed' : 'active',
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

  const updatedRoom: GameRoom = {
    ...room,
    state: cloneGameState(newState),
    status: newState.phase === 'finished' ? 'completed' : 'active',
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

  const updatedRoom: GameRoom = {
    ...room,
    status: 'completed',
  };

  rooms.set(roomId, updatedRoom);
  return cloneRoom(updatedRoom);
}

export function removeRoom(roomId: string): boolean {
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

  rooms.clear();
}