import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState, MovePayload } from 'shared';

const {
  mockGetRoom,
  mockGetGameState,
  mockUpdateRoomState,
  mockMarkRoomCompleted,
  mockGetRoomByPlayerId,
  mockValidateMove,
  mockApplyMove,
  mockClearReconnectToken,
  mockRegisterSession,
  mockSetSessionSocketDisconnectHandler,
  mockGetSession,
  mockIssueReconnectToken,
  mockMarkDisconnected,
  mockRebindSession,
  mockValidateReconnectToken,
  mockAddToQueue,
  mockRemoveFromQueue,
  mockTryMatchPair,
  mockCreateRoom,
  mockStartAiGame,
  mockHandleAiMove,
  mockCleanupAiGame,
  mockIsAiGame,
  mockStartGraceTimer,
  mockCancelGraceTimer,
} = vi.hoisted(() => ({
  mockGetRoom: vi.fn(),
  mockGetGameState: vi.fn(),
  mockUpdateRoomState: vi.fn(),
  mockMarkRoomCompleted: vi.fn(),
  mockGetRoomByPlayerId: vi.fn(),
  mockValidateMove: vi.fn(),
  mockApplyMove: vi.fn(),
  mockClearReconnectToken: vi.fn(),
  mockRegisterSession: vi.fn(),
  mockSetSessionSocketDisconnectHandler: vi.fn(),
  mockGetSession: vi.fn(),
  mockIssueReconnectToken: vi.fn(),
  mockMarkDisconnected: vi.fn(),
  mockRebindSession: vi.fn(),
  mockValidateReconnectToken: vi.fn(),
  mockAddToQueue: vi.fn(),
  mockRemoveFromQueue: vi.fn(),
  mockTryMatchPair: vi.fn(),
  mockCreateRoom: vi.fn(),
  mockStartAiGame: vi.fn(),
  mockHandleAiMove: vi.fn(),
  mockCleanupAiGame: vi.fn(),
  mockIsAiGame: vi.fn(),
  mockStartGraceTimer: vi.fn(),
  mockCancelGraceTimer: vi.fn(),
}));

vi.mock('./room/room-manager.js', () => ({
  createRoom: mockCreateRoom,
  getGameState: mockGetGameState,
  getRoomByPlayerId: mockGetRoomByPlayerId,
  getRoom: mockGetRoom,
  updateRoomState: mockUpdateRoomState,
  markRoomCompleted: mockMarkRoomCompleted,
}));

vi.mock('./room/grace-timer.js', () => ({
  startGraceTimer: mockStartGraceTimer,
  cancelGraceTimer: mockCancelGraceTimer,
}));

vi.mock('./config.js', () => ({
  config: {
    gracePeriodMs: 30_000,
  },
}));

vi.mock('./game/game-engine.js', () => ({
  validateMove: mockValidateMove,
  applyMove: mockApplyMove,
}));

vi.mock('./session/session-manager.js', () => ({
  clearReconnectToken: mockClearReconnectToken,
  getSession: mockGetSession,
  issueReconnectToken: mockIssueReconnectToken,
  markDisconnected: mockMarkDisconnected,
  rebindSession: mockRebindSession,
  registerSession: mockRegisterSession,
  setSessionSocketDisconnectHandler: mockSetSessionSocketDisconnectHandler,
  validateReconnectToken: mockValidateReconnectToken,
}));

vi.mock('./matchmaking/matchmaking.js', () => ({
  addToQueue: mockAddToQueue,
  removeFromQueue: mockRemoveFromQueue,
  tryMatchPair: mockTryMatchPair,
}));

vi.mock('./game/ai-game-handler.js', () => ({
  cleanupAiGame: mockCleanupAiGame,
  handleAiMove: mockHandleAiMove,
  isAiGame: mockIsAiGame,
  startAiGame: mockStartAiGame,
}));

vi.mock('./utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import { registerSocketHandlers } from './socket-handler.js';

type MockSocket = {
  id: string;
  data: { playerId: string; roomId: string | null };
  handshake: { auth: Record<string, unknown> };
  emit: ReturnType<typeof vi.fn>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  join: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  listeners: Map<string, (...args: unknown[]) => void>;
};

type MockServer = {
  on: (event: string, handler: (socket: MockSocket) => void) => void;
  to: ReturnType<typeof vi.fn>;
  sockets: { sockets: Map<string, MockSocket> };
  listeners: Map<string, (socket: MockSocket) => void>;
};

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    roomId: 'room-1',
    board: [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ],
    currentTurn: 'X',
    players: [
      {
        playerId: 'player-1',
        displayName: 'Player One',
        avatarUrl: 'https://robohash.org/player-1',
        symbol: 'X',
        connected: true,
      },
      {
        playerId: 'player-2',
        displayName: 'Player Two',
        avatarUrl: 'https://robohash.org/player-2',
        symbol: 'O',
        connected: true,
      },
    ],
    phase: 'playing',
    outcome: null,
    moveCount: 0,
    ...overrides,
  };
}

function createRoom(state: GameState = createState()) {
  return {
    roomId: state.roomId,
    playerIds: state.players.map((player) => player.playerId),
    state,
    createdAt: new Date().toISOString(),
    status: state.phase === 'finished' ? 'completed' : 'active',
  };
}

function createSocket(playerId = 'player-1', roomId: string | null = 'room-1'): MockSocket {
  const listeners = new Map<string, (...args: unknown[]) => void>();

  return {
    id: `${playerId}-socket`,
    data: { playerId, roomId },
    handshake: { auth: {} },
    emit: vi.fn(),
    on: (event, handler) => {
      listeners.set(event, handler);
    },
    join: vi.fn(async () => undefined),
    disconnect: vi.fn(),
    listeners,
  };
}

function createIo(): MockServer {
  const listeners = new Map<string, (socket: MockSocket) => void>();

  return {
    on: (event, handler) => {
      listeners.set(event, handler);
    },
    to: vi.fn(() => ({ emit: vi.fn() })),
    sockets: { sockets: new Map<string, MockSocket>() },
    listeners,
  };
}

function connectSocket(io: MockServer, socket: MockSocket): void {
  const connectionHandler = io.listeners.get('connection');

  if (connectionHandler === undefined) {
    throw new Error('Expected connection handler to be registered.');
  }

  io.sockets.sockets.set(socket.id, socket);
  connectionHandler(socket);
}

function triggerMakeMove(socket: MockSocket, payload: MovePayload): void {
  const handler = socket.listeners.get('make_move');

  if (handler === undefined) {
    throw new Error('Expected make_move handler to be registered.');
  }

  handler(payload);
}

function triggerDisconnect(socket: MockSocket): void {
  const handler = socket.listeners.get('disconnect');

  if (handler === undefined) {
    throw new Error('Expected disconnect handler to be registered.');
  }

  handler('transport close');
}

async function triggerReconnectAttempt(
  socket: MockSocket,
  payload: { playerId: string; reconnectToken: string },
): Promise<void> {
  const handler = socket.listeners.get('reconnect_attempt');

  if (handler === undefined) {
    throw new Error('Expected reconnect_attempt handler to be registered.');
  }

  await handler(payload);
}

function expectRoomBroadcast(io: MockServer, roomId: string, eventName: string, payload: unknown): void {
  expect(io.to).toHaveBeenCalledWith(roomId);
  const roomChannel = io.to.mock.results[0]?.value as { emit: (event: string, data: unknown) => void };
  expect(roomChannel.emit).toHaveBeenCalledWith(eventName, payload);
}

describe('registerSocketHandlers make_move (online)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsAiGame.mockReturnValue(false);
    mockGetRoomByPlayerId.mockReturnValue(null);
    mockTryMatchPair.mockReturnValue(null);
    mockCleanupAiGame.mockReturnValue({ error: null });
    mockRegisterSession.mockReturnValue({
      playerId: 'player-1',
      socketId: 'player-1-socket',
      roomId: null,
      reconnectToken: null,
      connected: true,
    });
  });

  it('2.5.1.5a — broadcasts game_state_update for a valid online move', () => {
    const io = createIo();
    const socket = createSocket();
    const initialState = createState();
    const updatedState = createState({
      board: [
        ['X', null, null],
        [null, null, null],
        [null, null, null],
      ],
      currentTurn: 'O',
      moveCount: 1,
    });

    mockGetRoom.mockReturnValue(createRoom(initialState));
    mockValidateMove.mockReturnValue({ valid: true });
    mockApplyMove.mockReturnValue(updatedState);

    registerSocketHandlers(io as never);
    connectSocket(io, socket);

    triggerMakeMove(socket, { roomId: 'room-1', position: { row: 0, col: 0 } });

    expect(mockValidateMove).toHaveBeenCalledWith(initialState, { row: 0, col: 0 }, 'X');
    expect(mockApplyMove).toHaveBeenCalledWith(initialState, { row: 0, col: 0 }, 'X');
    expect(mockUpdateRoomState).toHaveBeenCalledWith('room-1', updatedState);
    expectRoomBroadcast(io, 'room-1', 'game_state_update', updatedState);
    expect(socket.emit).not.toHaveBeenCalledWith('move_rejected', expect.anything());
  });

  it('2.5.1.5b — emits move_rejected for occupied-cell invalid move', () => {
    const io = createIo();
    const socket = createSocket();
    const initialState = createState();

    mockGetRoom.mockReturnValue(createRoom(initialState));
    mockValidateMove.mockReturnValue({
      valid: false,
      code: 'CELL_OCCUPIED',
      message: 'Cell (0, 0) is already occupied.',
    });

    registerSocketHandlers(io as never);
    connectSocket(io, socket);

    triggerMakeMove(socket, { roomId: 'room-1', position: { row: 0, col: 0 } });

    expect(socket.emit).toHaveBeenCalledWith('move_rejected', {
      code: 'CELL_OCCUPIED',
      message: 'Cell (0, 0) is already occupied.',
    });
    expect(mockApplyMove).not.toHaveBeenCalled();
    expect(mockUpdateRoomState).not.toHaveBeenCalled();
  });

  it('2.5.1.5c — emits move_rejected for wrong-turn invalid move', () => {
    const io = createIo();
    const socket = createSocket();
    const initialState = createState();

    mockGetRoom.mockReturnValue(createRoom(initialState));
    mockValidateMove.mockReturnValue({
      valid: false,
      code: 'WRONG_TURN',
      message: "It is not X's turn.",
    });

    registerSocketHandlers(io as never);
    connectSocket(io, socket);

    triggerMakeMove(socket, { roomId: 'room-1', position: { row: 0, col: 1 } });

    expect(socket.emit).toHaveBeenCalledWith('move_rejected', {
      code: 'WRONG_TURN',
      message: "It is not X's turn.",
    });
    expect(mockApplyMove).not.toHaveBeenCalled();
  });

  it('2.5.1.5d — emits move_rejected when room does not exist', () => {
    const io = createIo();
    const socket = createSocket();

    mockGetRoom.mockReturnValue(null);

    registerSocketHandlers(io as never);
    connectSocket(io, socket);

    triggerMakeMove(socket, { roomId: 'missing-room', position: { row: 0, col: 0 } });

    expect(socket.emit).toHaveBeenCalledWith('move_rejected', {
      code: 'ROOM_NOT_FOUND',
      message: 'Room missing-room was not found.',
    });
    expect(mockValidateMove).not.toHaveBeenCalled();
  });

  it('2.5.1.5e — emits move_rejected when player is not a member of the room', () => {
    const io = createIo();
    const socket = createSocket('outside-player', null);
    const initialState = createState();

    mockGetRoom.mockReturnValue(createRoom(initialState));

    registerSocketHandlers(io as never);
    connectSocket(io, socket);

    triggerMakeMove(socket, { roomId: 'room-1', position: { row: 0, col: 0 } });

    expect(socket.emit).toHaveBeenCalledWith('move_rejected', {
      code: 'NOT_IN_ROOM',
      message: 'Player is not a member of the specified room.',
    });
    expect(mockValidateMove).not.toHaveBeenCalled();
  });

  it('2.5.1.5f — broadcasts game_over, marks room completed, and clears reconnect tokens', () => {
    const io = createIo();
    const socket = createSocket();
    const initialState = createState();
    const finishedState = createState({
      board: [
        ['X', 'X', 'X'],
        ['O', 'O', null],
        [null, null, null],
      ],
      currentTurn: 'O',
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
    });

    mockGetRoom.mockReturnValue(createRoom(initialState));
    mockValidateMove.mockReturnValue({ valid: true });
    mockApplyMove.mockReturnValue(finishedState);

    registerSocketHandlers(io as never);
    connectSocket(io, socket);

    triggerMakeMove(socket, { roomId: 'room-1', position: { row: 0, col: 2 } });

    const toCalls = io.to.mock.results;
    expect(toCalls).toHaveLength(2);

    const firstChannel = toCalls[0]?.value as { emit: (event: string, data: unknown) => void };
    const secondChannel = toCalls[1]?.value as { emit: (event: string, data: unknown) => void };

    expect(firstChannel.emit).toHaveBeenCalledWith('game_state_update', finishedState);
    expect(secondChannel.emit).toHaveBeenCalledWith('game_over', finishedState);
    expect(mockMarkRoomCompleted).toHaveBeenCalledWith('room-1');
    expect(mockClearReconnectToken).toHaveBeenCalledWith('player-1');
    expect(mockClearReconnectToken).toHaveBeenCalledWith('player-2');
  });
});

describe('registerSocketHandlers disconnect/reconnect grace flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsAiGame.mockReturnValue(false);
    mockGetRoomByPlayerId.mockReturnValue(null);
    mockTryMatchPair.mockReturnValue(null);
    mockCleanupAiGame.mockReturnValue({ error: null });
    mockRegisterSession.mockReturnValue({
      playerId: 'player-1',
      socketId: 'player-1-socket',
      roomId: 'room-1',
      reconnectToken: null,
      connected: true,
    });
  });

  it('3.1.5.3 — disconnect in active online game emits player_disconnected and starts grace timer', () => {
    const io = createIo();
    const socket = createSocket('player-1', 'room-1');
    const roomState = createState();

    mockMarkDisconnected.mockReturnValue({
      playerId: 'player-1',
      socketId: null,
      roomId: 'room-1',
      reconnectToken: 'token-1',
      connected: false,
    });
    mockGetRoomByPlayerId.mockReturnValue(createRoom(roomState));

    registerSocketHandlers(io as never);
    connectSocket(io, socket);
    triggerDisconnect(socket);

    const expectedState = {
      ...roomState,
      players: roomState.players.map((player) =>
        player.playerId === 'player-1' ? { ...player, connected: false } : player,
      ),
    };

    expect(mockUpdateRoomState).toHaveBeenCalledWith('room-1', expectedState);
    expect(mockStartGraceTimer).toHaveBeenCalledTimes(1);
    expect(mockStartGraceTimer).toHaveBeenCalledWith('player-1', 30_000, expect.any(Function));

    const roomChannels = io.to.mock.results.map((result) => result.value as { emit: ReturnType<typeof vi.fn> });
    expect(roomChannels).toHaveLength(2);
    expect(roomChannels[0]?.emit).toHaveBeenCalledWith('game_state_update', expectedState);
    expect(roomChannels[1]?.emit).toHaveBeenCalledWith('player_disconnected', {
      playerId: 'player-1',
      gracePeriodMs: 30_000,
    });
  });

  it('3.1.5.4 — grace timer expiry resolves forfeit and emits game_over', () => {
    const io = createIo();
    const socket = createSocket('player-1', 'room-1');
    const roomState = createState({
      players: [
        { ...createState().players[0]!, connected: false },
        { ...createState().players[1]!, connected: true },
      ],
    });

    mockMarkDisconnected.mockReturnValue({
      playerId: 'player-1',
      socketId: null,
      roomId: 'room-1',
      reconnectToken: 'token-1',
      connected: false,
    });
    mockGetRoomByPlayerId.mockReturnValue(createRoom(roomState));
    mockGetRoom.mockReturnValue(createRoom(roomState));

    registerSocketHandlers(io as never);
    connectSocket(io, socket);
    triggerDisconnect(socket);

    const onExpiry = mockStartGraceTimer.mock.calls[0]?.[2] as (() => void) | undefined;
    expect(onExpiry).toBeTypeOf('function');

    onExpiry?.();

    const expectedFinalState = {
      ...roomState,
      phase: 'finished' as const,
      outcome: {
        type: 'forfeit' as const,
        winner: 'O' as const,
        winningLine: null,
      },
    };

    expect(mockUpdateRoomState).toHaveBeenCalledWith('room-1', expectedFinalState);
    expect(mockMarkRoomCompleted).toHaveBeenCalledWith('room-1');
    expect(mockClearReconnectToken).toHaveBeenCalledWith('player-1');
    expect(mockClearReconnectToken).toHaveBeenCalledWith('player-2');

    const roomChannels = io.to.mock.results.map((result) => result.value as { emit: ReturnType<typeof vi.fn> });
    const gameOverChannel = roomChannels[roomChannels.length - 1];
    expect(gameOverChannel?.emit).toHaveBeenCalledWith('game_over', expectedFinalState);
  });

  it('3.1.5.5 — reconnect within grace cancels timer and emits player_reconnected', async () => {
    const io = createIo();
    const socket = createSocket('player-1', null);
    const roomState = createState({
      players: [
        { ...createState().players[0]!, connected: false },
        createState().players[1]!,
      ],
    });

    mockValidateReconnectToken.mockReturnValue({
      playerId: 'player-1',
      socketId: null,
      roomId: 'room-1',
      reconnectToken: 'token-1',
      connected: false,
    });
    mockRebindSession.mockReturnValue({
      playerId: 'player-1',
      socketId: 'player-1-socket',
      roomId: 'room-1',
      reconnectToken: 'token-1',
      connected: true,
    });
    mockGetRoom.mockReturnValue(createRoom(roomState));
    mockGetGameState.mockReturnValue({
      ...roomState,
      players: roomState.players.map((player) =>
        player.playerId === 'player-1' ? { ...player, connected: true } : player,
      ),
    });

    registerSocketHandlers(io as never);
    connectSocket(io, socket);
    await triggerReconnectAttempt(socket, { playerId: 'player-1', reconnectToken: 'token-1' });

    expect(mockCancelGraceTimer).toHaveBeenCalledWith('player-1');
    expect(socket.join).toHaveBeenCalledWith('room-1');

    const updatedState = {
      ...roomState,
      players: roomState.players.map((player) =>
        player.playerId === 'player-1' ? { ...player, connected: true } : player,
      ),
    };
    expect(mockUpdateRoomState).toHaveBeenCalledWith('room-1', updatedState);

    const roomChannels = io.to.mock.results.map((result) => result.value as { emit: ReturnType<typeof vi.fn> });
    expect(roomChannels[0]?.emit).toHaveBeenCalledWith('game_state_update', updatedState);
    expect(roomChannels[1]?.emit).toHaveBeenCalledWith('player_reconnected', { playerId: 'player-1' });

    expect(socket.emit).toHaveBeenCalledWith('reconnect_success', expect.objectContaining({ roomId: 'room-1' }));
  });

  it('3.1.5.6 — disconnect in AI room does not start grace timer', () => {
    const io = createIo();
    const socket = createSocket('player-1', 'ai-player-1');

    mockMarkDisconnected.mockReturnValue({
      playerId: 'player-1',
      socketId: null,
      roomId: 'ai-player-1',
      reconnectToken: null,
      connected: false,
    });
    mockGetRoomByPlayerId.mockReturnValue({
      ...createRoom(createState({ roomId: 'ai-player-1' })),
      roomId: 'ai-player-1',
    });

    registerSocketHandlers(io as never);
    connectSocket(io, socket);
    triggerDisconnect(socket);

    expect(mockStartGraceTimer).not.toHaveBeenCalled();
  });

  it('3.1.5.7 — disconnect with no active room does not start grace timer', () => {
    const io = createIo();
    const socket = createSocket('player-1', null);

    mockMarkDisconnected.mockReturnValue({
      playerId: 'player-1',
      socketId: null,
      roomId: null,
      reconnectToken: null,
      connected: false,
    });

    registerSocketHandlers(io as never);
    connectSocket(io, socket);
    triggerDisconnect(socket);

    expect(mockStartGraceTimer).not.toHaveBeenCalled();
  });

  it('3.1.5.8 — dual disconnect expiry with no connected players resolves without winner', () => {
    const io = createIo();
    const socket = createSocket('player-1', 'room-1');
    const roomState = createState({
      players: [
        { ...createState().players[0]!, connected: false },
        { ...createState().players[1]!, connected: false },
      ],
    });

    mockMarkDisconnected.mockReturnValue({
      playerId: 'player-1',
      socketId: null,
      roomId: 'room-1',
      reconnectToken: 'token-1',
      connected: false,
    });
    mockGetRoomByPlayerId.mockReturnValue(createRoom(roomState));
    mockGetRoom.mockReturnValue(createRoom(roomState));

    registerSocketHandlers(io as never);
    connectSocket(io, socket);
    triggerDisconnect(socket);

    const onExpiry = mockStartGraceTimer.mock.calls[0]?.[2] as (() => void) | undefined;
    onExpiry?.();

    const expectedFinalState = {
      ...roomState,
      phase: 'finished' as const,
      outcome: {
        type: 'draw' as const,
        winner: null,
        winningLine: null,
      },
    };

    expect(mockUpdateRoomState).toHaveBeenCalledWith('room-1', expectedFinalState);
    expect(mockMarkRoomCompleted).toHaveBeenCalledWith('room-1');
  });
});
