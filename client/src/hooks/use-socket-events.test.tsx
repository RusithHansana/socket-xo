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

vi.mock('./use-connection-dispatch', () => ({
  useConnectionDispatch: () => mockUseConnectionDispatch(),
}));

vi.mock('./use-game-dispatch', () => ({
  useGameDispatch: () => mockUseGameDispatch(),
}));

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type SocketHandler = (...args: unknown[]) => void;

function createMockSocket() {
  const handlers = new Map<string, SocketHandler>();

  const socket = {
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

function HookProbe({ socket }: { socket: TypedSocket | null }): ReactElement | null {
  useSocketEvents(socket);
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

    act(() => {
      root?.render(<HookProbe socket={socket} />);
    });

    handlers.get('connect')?.();
    handlers.get('queue_joined')?.();
    handlers.get('game_start')?.(sampleGameState);
    handlers.get('game_state_update')?.(sampleGameState);
    handlers.get('move_rejected')?.({ code: 'CELL_TAKEN', message: 'Cell already occupied' });
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
      type: 'MOVE_REJECTED',
      payload: { code: 'CELL_TAKEN', message: 'Cell already occupied' },
    });
  });

  it('logs server error payloads and unregisters listeners on cleanup', () => {
    const connectionDispatch = vi.fn();
    const gameDispatch = vi.fn();
    const { socket, handlers } = createMockSocket();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mockUseConnectionDispatch.mockReturnValue(connectionDispatch);
    mockUseGameDispatch.mockReturnValue(gameDispatch);

    root = createRoot(container);

    act(() => {
      root?.render(<HookProbe socket={socket} />);
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
        'game_start',
        'game_state_update',
        'move_rejected',
        'game_over',
        'error',
      ]),
    );
  });
});