import type { GameState, PlayerInfo } from 'shared';
import { MAX_PLAYERS_PER_ROOM } from 'shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addPlayerToRoom,
  clearAllRooms,
  createWaitingRoom,
  createRoom,
  getAllRooms,
  getCompletedRooms,
  getGameState,
  getRoom,
  getRoomByPlayerId,
  markRoomAbandoned,
  markRoomCompleted,
  ROOM_COMPLETION_CLEANUP_DELAY_MS,
  ROOM_ORPHAN_MAX_AGE_MS,
  runRoomSweepOnce,
  removeRoom,
  scheduleRoomRemoval,
  updateRoomState,
} from './room-manager.js';
import { logger } from '../utils/logger.js';

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
    chatMessages: [],
  };
}

describe('room-manager', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('6.8.1 — getRoomByPlayerId prioritizes active rooms over completed rooms', () => {
    const room1 = createRoom(
      'player-1',
      'player-X',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-X'),
    );
    markRoomCompleted(room1.roomId);

    const room2 = createRoom(
      'player-1',
      'player-Y',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-Y'),
    );

    const foundRoom = getRoomByPlayerId('player-1');
    expect(foundRoom?.roomId).toBe(room2.roomId);
    expect(foundRoom?.status).toBe('active');
  });

  it('6.9 — addPlayerToRoom is unreachable on success because rooms are created full', () => {
    const waitingRoom = createWaitingRoom('player-1', createPlayerInfo('player-1'));

    const result = addPlayerToRoom(waitingRoom.roomId, 'player-2', createPlayerInfo('player-2'));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.room.playerIds).toEqual(['player-1', 'player-2']);
      expect(result.room.status).toBe('active');
      expect(result.room.state.phase).toBe('playing');
      expect(result.room.state.players).toHaveLength(2);
      expect(result.room.state.players[0]?.symbol).toBe('X');
      expect(result.room.state.players[1]?.symbol).toBe('O');
    }
  });

  it('4.1 — createWaitingRoom creates a waiting room with one X player and initial waiting state', () => {
    const room = createWaitingRoom('player-1', createPlayerInfo('player-1'));

    expect(room.roomId).toMatch(UUID_V4_PATTERN);
    expect(room.playerIds).toEqual(['player-1']);
    expect(room.status).toBe('waiting');
    expect(room.state.phase).toBe('waiting');
    expect(room.state.currentTurn).toBe('X');
    expect(room.state.moveCount).toBe(0);
    expect(room.state.outcome).toBeNull();
    expect(room.state.board).toEqual([
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ]);
    expect(room.state.players).toEqual([
      {
        ...createPlayerInfo('player-1'),
        symbol: 'X',
      },
    ]);
  });

  it('6.9.1 — addPlayerToRoom rejects with INVALID_PLAYER_ID for mismatching payload', () => {
    const initialRoom = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );
    
    const result = addPlayerToRoom(initialRoom.roomId, 'player-3', createPlayerInfo('player-4'));

    expect(result).toEqual({
      success: false,
      error: {
        code: 'INVALID_PLAYER_ID',
        message: 'Player ID mismatch: player-3 !== player-4',
      },
    });
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

  it('6.12.1 — addPlayerToRoom rejects join attempts for completed rooms', () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    markRoomCompleted(room.roomId);

    const result = addPlayerToRoom(room.roomId, 'player-3', createPlayerInfo('player-3'));

    expect(result).toEqual({
      success: false,
      error: {
        code: 'GAME_ENDED',
        message: `Game in room ${room.roomId} has already ended.`,
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
      expect.objectContaining({
        ...completedRoom,
        status: 'completed',
        completedAt: expect.any(String),
      }),
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

  it('6.1.1 — markRoomCompleted schedules delayed room removal after 5 seconds', () => {
    vi.useFakeTimers();
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    markRoomCompleted(room.roomId);

    expect(getRoom(room.roomId)).not.toBeNull();
    vi.advanceTimersByTime(ROOM_COMPLETION_CLEANUP_DELAY_MS - 1);
    expect(getRoom(room.roomId)).not.toBeNull();

    vi.advanceTimersByTime(1);
    expect(getRoom(room.roomId)).toBeNull();
  });

  it('6.1.2 — scheduleRoomRemoval replaces previous timer for same room', () => {
    vi.useFakeTimers();
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    scheduleRoomRemoval(room.roomId, 5_000, 'completed');
    scheduleRoomRemoval(room.roomId, 10_000, 'completed');

    vi.advanceTimersByTime(5_000);
    expect(getRoom(room.roomId)).not.toBeNull();

    vi.advanceTimersByTime(5_000);
    expect(getRoom(room.roomId)).toBeNull();
  });

  it('6.1.3 — markRoomAbandoned records abandonment timestamp', () => {
    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );

    const abandonedRoom = markRoomAbandoned(room.roomId);

    expect(abandonedRoom?.abandonedAt).not.toBeNull();
    expect(getRoom(room.roomId)?.abandonedAt).not.toBeNull();
  });

  it('6.1.4 — runRoomSweepOnce removes orphaned rooms older than 10 minutes and logs cleanup', () => {
    vi.useFakeTimers();
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);

    vi.setSystemTime(new Date('2026-03-18T10:00:00.000Z'));
    const oldAbandonedRoom = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );
    markRoomAbandoned(oldAbandonedRoom.roomId);

    vi.setSystemTime(new Date('2026-03-18T10:11:00.000Z'));
    const removedCount = runRoomSweepOnce();

    expect(removedCount).toBe(1);
    expect(getRoom(oldAbandonedRoom.roomId)).toBeNull();
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: oldAbandonedRoom.roomId,
        reason: 'abandoned',
        ageMs: expect.any(Number),
      }),
      'Removed orphaned room during periodic sweep',
    );

    infoSpy.mockRestore();
  });

  it('6.1.5 — runRoomSweepOnce keeps recent abandoned rooms', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T10:00:00.000Z'));

    const room = createRoom(
      'player-1',
      'player-2',
      createPlayerInfo('player-1'),
      createPlayerInfo('player-2'),
    );
    markRoomAbandoned(room.roomId);

    vi.setSystemTime(new Date('2026-03-18T10:09:59.000Z'));
    const removedCount = runRoomSweepOnce({ orphanAgeMs: ROOM_ORPHAN_MAX_AGE_MS });

    expect(removedCount).toBe(0);
    expect(getRoom(room.roomId)).not.toBeNull();
  });
});