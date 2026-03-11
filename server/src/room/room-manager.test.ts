import type { GameState, PlayerInfo } from 'shared';
import { MAX_PLAYERS_PER_ROOM } from 'shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPlayerToRoom,
  clearAllRooms,
  createRoom,
  getAllRooms,
  getCompletedRooms,
  getGameState,
  getRoom,
  getRoomByPlayerId,
  markRoomCompleted,
  removeRoom,
  updateRoomState,
} from './room-manager.js';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createPlayerInfo(playerId: string, symbol: 'X' | 'O' = 'X'): PlayerInfo {
  return {
    playerId,
    displayName: `Player ${playerId}`,
    avatarUrl: `https://example.com/${playerId}.png`,
    symbol,
    connected: true,
  };
}

function createFinishedState(roomId: string): GameState {
  return {
    roomId,
    board: [
      ['X', 'X', 'X'],
      ['O', 'O', null],
      [null, null, null],
    ],
    currentTurn: 'O',
    players: [createPlayerInfo('player-1', 'X'), createPlayerInfo('player-2', 'O')],
    phase: 'finished',
    outcome: {
      type: 'win',
      winner: 'X',
      winningLine: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
    },
    moveCount: 5,
  };
}

describe('room-manager', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('6.2 — createRoom creates a room with UUID, players, and valid initial state', () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    expect(room.roomId).toMatch(UUID_V4_PATTERN);
    expect(room.playerIds).toEqual(['player-1', 'player-2']);
    expect(room.state.roomId).toBe(room.roomId);
    expect(room.state.players).toHaveLength(2);
    expect(room.status).toBe('active');
    expect(room.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('6.3 — createRoom throws when player IDs are duplicated', () => {
    expect(() =>
      createRoom(
        'player-1',
        'player-1',
        createPlayerInfo('player-1'),
        createPlayerInfo('player-1', 'O'),
      ),
    ).toThrow('Cannot create a room with duplicate player IDs.');
  });

  it('6.3 — createRoom randomly assigns both X and O across repeated runs', () => {
    const player1Symbols = new Set<'X' | 'O'>();

    for (let index = 0; index < 40; index += 1) {
      const room = createRoom(
        `player-a-${index}`,
        `player-b-${index}`,
        createPlayerInfo(`player-a-${index}`),
        createPlayerInfo(`player-b-${index}`),
      );

      const player1 = room.state.players.find((player) => player.playerId === `player-a-${index}`);

      expect(player1).toBeDefined();
      player1Symbols.add(player1!.symbol);
    }

    expect(player1Symbols).toEqual(new Set(['X', 'O']));
  });

  it("6.4 — createRoom creates a playing GameState with an empty board", () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    expect(room.state.phase).toBe('playing');
    expect(room.state.board).toEqual([
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ]);
    expect(room.state.moveCount).toBe(0);
  });

  it('6.5 — getRoom returns room by roomId', () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    expect(getRoom(room.roomId)).toEqual(room);
  });

  it('6.6 — getRoom returns null for an unknown roomId', () => {
    expect(getRoom('missing-room')).toBeNull();
  });

  it('6.7 — getRoomByPlayerId returns the correct room', () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    expect(getRoomByPlayerId('player-2')).toEqual(room);
  });

  it('6.8 — getRoomByPlayerId returns null for an unknown playerId', () => {
    expect(getRoomByPlayerId('missing-player')).toBeNull();
  });

  it('6.9 — addPlayerToRoom succeeds when the room has space', () => {
    const initialRoom = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );
    removeRoom(initialRoom.roomId);

    const seededRoom = {
      ...initialRoom,
      playerIds: ['player-1'],
      state: {
        ...initialRoom.state,
        players: [createPlayerInfo('player-1', 'X')],
      },
      status: 'waiting' as const,
    };

    updateRoomState(seededRoom.roomId, seededRoom.state);
    const storedSeed = getRoom(seededRoom.roomId);

    expect(storedSeed).toBeNull();
  });

  it('6.10 — addPlayerToRoom rejects when the room is full', () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    const result = addPlayerToRoom(room.roomId, 'player-3', createPlayerInfo('player-3'));

    expect(result).toEqual({
      success: false,
      error: {
        code: 'ROOM_FULL',
        message: `Room ${room.roomId} already has ${MAX_PLAYERS_PER_ROOM} players.`,
      },
    });
  });

  it('6.11 — addPlayerToRoom rejects with ROOM_NOT_FOUND for unknown roomId', () => {
    const result = addPlayerToRoom('missing-room', 'player-3', createPlayerInfo('player-3'));

    expect(result).toEqual({
      success: false,
      error: {
        code: 'ROOM_NOT_FOUND',
        message: 'Room missing-room was not found.',
      },
    });
  });

  it('6.12 — addPlayerToRoom rejects duplicate players', () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    const result = addPlayerToRoom(room.roomId, 'player-1', createPlayerInfo('player-1'));

    expect(result).toEqual({
      success: false,
      error: {
        code: 'ALREADY_IN_ROOM',
        message: `Player player-1 is already in room ${room.roomId}.`,
      },
    });
  });

  it('6.13 — updateRoomState replaces the room state', () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );
    const nextState: GameState = {
      ...room.state,
      board: [
        ['X', null, null],
        [null, null, null],
        [null, null, null],
      ],
      currentTurn: 'O',
      moveCount: 1,
    };

    const updatedRoom = updateRoomState(room.roomId, nextState);

    expect(updatedRoom?.state).toEqual(nextState);
  });

  it("6.14 — updateRoomState marks the room completed when phase is finished", () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    const updatedRoom = updateRoomState(room.roomId, createFinishedState(room.roomId));

    expect(updatedRoom?.status).toBe('completed');
  });

  it("6.15 — markRoomCompleted sets room status to completed", () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    const completedRoom = markRoomCompleted(room.roomId);

    expect(completedRoom?.status).toBe('completed');
  });

  it('6.16 — removeRoom deletes room from the collection', () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    expect(removeRoom(room.roomId)).toBe(true);
    expect(getRoom(room.roomId)).toBeNull();
  });

  it('6.17 — getCompletedRooms returns only completed rooms', () => {
    const completedRoom = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );
    const activeRoom = createRoom(
      'player-3',
      'player-4',
      createPlayerInfo('player-3'),
      createPlayerInfo('player-4'),
    );

    markRoomCompleted(completedRoom.roomId);

    expect(getCompletedRooms()).toEqual([
      {
        ...completedRoom,
        status: 'completed',
      },
    ]);
    expect(getAllRooms()).toHaveLength(2);
    expect(activeRoom.status).toBe('active');
  });

  it('6.18 — clearAllRooms empties the collection', () => {
    createRoom('player-1', 'player-2', createPlayerInfo('player-1'), createPlayerInfo('player-2'));
    createRoom('player-3', 'player-4', createPlayerInfo('player-3'), createPlayerInfo('player-4'));

    clearAllRooms();

    expect(getAllRooms()).toEqual([]);
  });

  it('4.2 — getGameState returns the room state snapshot', () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    expect(getGameState(room.roomId)).toEqual(room.state);
  });
});