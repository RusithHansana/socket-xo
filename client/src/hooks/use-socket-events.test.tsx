// @vitest-environment jsdom

import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from 'shared';
import type { TypedSocket } from '../services/socket-service';
import { useSocketEvents } from './use-socket-events';

const mockUseConnectionDispatch = vi.fn();
const mockUseGameDispatch = vi.fn();
const mockUseChatDispatch = vi.fn();
const mockGetReconnectToken = vi.fn();
const mockStoreReconnectToken = vi.fn();
const mockClearReconnectToken = vi.fn();

vi.mock('./use-connection-dispatch', () => ({
  useConnectionDispatch: () => mockUseConnectionDispatch(),
}));

vi.mock('./use-game-dispatch', () => ({
  useGameDispatch: () => mockUseGameDispatch(),
}));

vi.mock('./use-chat-dispatch', () => ({
  useChatDispatch: () => mockUseChatDispatch(),
}));

vi.mock('../services/reconnect-token-service', () => ({
  getReconnectToken: (playerId: string) => mockGetReconnectToken(playerId),
  storeReconnectToken: (playerId: string, token: string) => mockStoreReconnectToken(playerId, token),
  clearReconnectToken: (playerId: string) => mockClearReconnectToken(playerId),
}));

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type SocketHandler = (...args: unknown[]) => void;

function createMockSocket() {
  const handlers = new Map<string, SocketHandler>();

  const socket = {
    emit: vi.fn(),
    on: vi.fn((event: string, handler: SocketHandler) => {
      handlers.set(event, handler);
      return socket;
    }),
    off: vi.fn((event: string, handler: SocketHandler) => {
      if (handlers.get(event) === handler) {
        handlers.delete(event);
      }

      return socket;
    }),
  } as unknown as TypedSocket;

  return {
    socket,
    handlers,
  };
}

function HookProbe({ socket, playerId }: { socket: TypedSocket | null; playerId: string }): ReactElement | null {
  useSocketEvents(socket, playerId);
  return null;
}

const sampleGameState: GameState = {
  roomId: 'room-1',
  board: [
    ['X', null, null],
    [null, 'O', null],
    [null, null, null],
  ],
  currentTurn: 'X',
  players: [
    {
      playerId: 'player-x',
      displayName: 'Player X',
      avatarUrl: 'https://robohash.org/x',
      symbol: 'X',
      connected: true,
    },
    {
      playerId: 'player-o',
      displayName: 'Player O',
      avatarUrl: 'https://robohash.org/o',
      symbol: 'O',
      connected: true,
    },
  ],
  phase: 'playing',
  outcome: null,
  moveCount: 2,
};

describe('useSocketEvents', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });

    root = undefined;
    container.remove();
    mockUseConnectionDispatch.mockReset();
    mockUseGameDispatch.mockReset();
    mockGetReconnectToken.mockReset();
    mockStoreReconnectToken.mockReset();
    mockClearReconnectToken.mockReset();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
    vi.restoreAllMocks();
  });

  it('registers central socket listeners and dispatches connection and game actions', () => {
    const connectionDispatch = vi.fn();
    const gameDispatch = vi.fn();
    const { socket, handlers } = createMockSocket();

    mockUseConnectionDispatch.mockReturnValue(connectionDispatch);
    mockUseGameDispatch.mockReturnValue(gameDispatch);

    root = createRoot(container);
    mockGetReconnectToken.mockReturnValue(null);

    act(() => {
      root?.render(<HookProbe socket={socket} playerId="player-x" />);
    });

    handlers.get('connect')?.();
    handlers.get('queue_joined')?.();
    handlers.get('game_start')?.(sampleGameState);
    handlers.get('game_state_update')?.(sampleGameState);
    handlers.get('move_rejected')?.({ code: 'CELL_TAKEN', message: 'Cell already occupied' });
    handlers.get('room_created')?.({ roomId: 'room-created-1' });
    handlers.get('player_disconnected')?.({ playerId: 'player-o', gracePeriodMs: 30000 });
    handlers.get('player_reconnected')?.({ playerId: 'player-o' });
    handlers.get('reconnect_token')?.({ reconnectToken: 'token-1' });
    handlers.get('reconnect_success')?.(sampleGameState);
    handlers.get('reconnect_failed')?.({ code: 'SESSION_NOT_FOUND', message: 'Session missing' });
    handlers.get('game_over')?.({
      ...sampleGameState,
      phase: 'finished',
      outcome: {
        type: 'win',
        winner: 'X',
        winningLine: [
          { row: 0, col: 0 },
          { row: 1, col: 1 },
          { row: 2, col: 2 },
        ],
      },
    });

    expect(connectionDispatch).toHaveBeenCalledWith({ type: 'SET_CONNECTED' });
    expect(connectionDispatch).toHaveBeenCalledWith({ type: 'SET_SEARCHING' });
    expect(connectionDispatch).toHaveBeenCalledWith({ type: 'SET_IN_GAME' });
    expect(connectionDispatch).toHaveBeenCalledWith({ type: 'SET_GAME_OVER' });
    expect(gameDispatch).toHaveBeenCalledWith({ type: 'GAME_START', payload: sampleGameState });
    expect(gameDispatch).toHaveBeenCalledWith({ type: 'GAME_STATE_UPDATE', payload: sampleGameState });
    expect(gameDispatch).toHaveBeenCalledWith({
      type: 'ROOM_CREATED',
      payload: { roomId: 'room-created-1' },
    });
    expect(gameDispatch).toHaveBeenCalledWith({
      type: 'MOVE_REJECTED',
      payload: { code: 'CELL_TAKEN', message: 'Cell already occupied' },
    });
    expect(gameDispatch).toHaveBeenCalledWith({
      type: 'OPPONENT_DISCONNECTED',
      payload: { playerId: 'player-o', gracePeriodMs: 30000 },
    });
    expect(gameDispatch).toHaveBeenCalledWith({
      type: 'OPPONENT_RECONNECTED',
    });
    expect(gameDispatch).toHaveBeenCalledWith({
      type: 'RECONNECT_FAILED',
      payload: { code: 'SESSION_NOT_FOUND', message: 'Session missing' },
    });
    expect(mockStoreReconnectToken).toHaveBeenCalledWith('player-x', 'token-1');
    expect(mockClearReconnectToken).toHaveBeenCalledWith('player-x');
  });

  it('emits reconnect_attempt and transitions to reconnecting on connect when token exists', () => {
    const connectionDispatch = vi.fn();
    const gameDispatch = vi.fn();
    const { socket, handlers } = createMockSocket();

    mockUseConnectionDispatch.mockReturnValue(connectionDispatch);
    mockUseGameDispatch.mockReturnValue(gameDispatch);
    mockGetReconnectToken.mockReturnValue('token-abc');

    root = createRoot(container);

    act(() => {
      root?.render(<HookProbe socket={socket} playerId="player-x" />);
    });

    handlers.get('connect')?.();

    expect(connectionDispatch).toHaveBeenCalledWith({ type: 'SET_RECONNECTING' });
    expect(socket.emit).toHaveBeenCalledWith('reconnect_attempt', {
      playerId: 'player-x',
      reconnectToken: 'token-abc',
    });
  });

  it('dispatches SET_CONNECTED on connect when reconnect token does not exist', () => {
    const connectionDispatch = vi.fn();
    const gameDispatch = vi.fn();
    const { socket, handlers } = createMockSocket();

    mockUseConnectionDispatch.mockReturnValue(connectionDispatch);
    mockUseGameDispatch.mockReturnValue(gameDispatch);
    mockGetReconnectToken.mockReturnValue(null);

    root = createRoot(container);

    act(() => {
      root?.render(<HookProbe socket={socket} playerId="player-x" />);
    });

    handlers.get('connect')?.();

    expect(connectionDispatch).toHaveBeenCalledWith({ type: 'SET_CONNECTED' });
    expect(socket.emit).not.toHaveBeenCalledWith('reconnect_attempt', expect.anything());
  });

  it('logs server error payloads and unregisters listeners on cleanup', () => {
    const connectionDispatch = vi.fn();
    const gameDispatch = vi.fn();
    const { socket, handlers } = createMockSocket();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mockUseConnectionDispatch.mockReturnValue(connectionDispatch);
    mockUseGameDispatch.mockReturnValue(gameDispatch);

    root = createRoot(container);
    mockGetReconnectToken.mockReturnValue(null);

    act(() => {
      root?.render(<HookProbe socket={socket} playerId="player-x" />);
    });

    handlers.get('error')?.({ code: 'SERVER_ERROR', message: 'Unexpected error' });

    expect(errorSpy).toHaveBeenCalledWith('Socket server error', {
      code: 'SERVER_ERROR',
      message: 'Unexpected error',
    });

    act(() => {
      root?.unmount();
    });

    expect((socket.off as ReturnType<typeof vi.fn>).mock.calls.map(([event]) => event)).toEqual(
      expect.arrayContaining([
        'connect',
        'disconnect',
        'connect_error',
        'queue_joined',
        'room_created',
        'game_start',
        'game_state_update',
        'move_rejected',
        'player_disconnected',
        'player_reconnected',
        'reconnect_token',
        'reconnect_success',
        'reconnect_failed',
        'game_over',
        'error',
      ]),
    );
  });

  it('dispatches SET_ROOM_ERROR for room-specific server error codes', () => {
    const connectionDispatch = vi.fn();
    const gameDispatch = vi.fn();
    const { socket, handlers } = createMockSocket();

    mockUseConnectionDispatch.mockReturnValue(connectionDispatch);
    mockUseGameDispatch.mockReturnValue(gameDispatch);
    mockGetReconnectToken.mockReturnValue(null);

    root = createRoot(container);

    act(() => {
      root?.render(<HookProbe socket={socket} playerId="player-x" />);
    });

    handlers.get('error')?.({ code: 'ROOM_NOT_FOUND', message: "This room doesn't exist or has expired." });

    expect(gameDispatch).toHaveBeenCalledWith({
      type: 'SET_ROOM_ERROR',
      payload: {
        code: 'ROOM_NOT_FOUND',
        message: "This room doesn't exist or has expired.",
      },
    });
  });

  it('does not dispatch SET_ROOM_ERROR for non-room server error codes', () => {
    const connectionDispatch = vi.fn();
    const gameDispatch = vi.fn();
    const { socket, handlers } = createMockSocket();

    mockUseConnectionDispatch.mockReturnValue(connectionDispatch);
    mockUseGameDispatch.mockReturnValue(gameDispatch);
    mockGetReconnectToken.mockReturnValue(null);

    root = createRoot(container);

    act(() => {
      root?.render(<HookProbe socket={socket} playerId="player-x" />);
    });

    handlers.get('error')?.({ code: 'SERVER_ERROR', message: 'Unexpected error' });

    expect(gameDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET_ROOM_ERROR',
      }),
    );
  });
});