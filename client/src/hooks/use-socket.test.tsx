// @vitest-environment jsdom

import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TypedSocket } from '../services/socket-service';
import { useSocket } from './use-socket';
import { SocketProvider } from '../contexts/socket.provider';

const mockUseGuestIdentity = vi.fn();
const mockUseConnectionDispatch = vi.fn();
const mockCreateSocketConnection = vi.fn();
const mockUseSocketEvents = vi.fn();

vi.mock('./use-guest-identity', () => ({
  useGuestIdentity: () => mockUseGuestIdentity(),
}));

vi.mock('./use-connection-dispatch', () => ({
  useConnectionDispatch: () => mockUseConnectionDispatch(),
}));

vi.mock('../services/socket-service', () => ({
  createSocketConnection: (...args: unknown[]) => mockCreateSocketConnection(...args),
}));

vi.mock('./use-socket-events', () => ({
  useSocketEvents: (...args: unknown[]) => mockUseSocketEvents(...args),
}));

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function HookProbe({ onRender }: { onRender: (socket: TypedSocket | null) => void }): ReactElement | null {
  onRender(useSocket());
  return null;
}

describe('useSocket and SocketProvider', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);

    mockUseGuestIdentity.mockReturnValue({
      playerId: 'player-123',
      displayName: 'Player-123',
      avatarUrl: 'https://robohash.org/player-123',
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });

    root = undefined;
    container.remove();
    mockUseGuestIdentity.mockReset();
    mockUseConnectionDispatch.mockReset();
    mockCreateSocketConnection.mockReset();
    mockUseSocketEvents.mockReset();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
    vi.restoreAllMocks();
  });

  it('creates a socket once, marks the connection as connecting, and disconnects on unmount', () => {
    const dispatch = vi.fn();
    const connect = vi.fn();
    const disconnect = vi.fn();
    const renderedSockets: Array<TypedSocket | null> = [];
    const mockSocket = {
      connect,
      disconnect,
    } as unknown as TypedSocket;

    mockUseConnectionDispatch.mockReturnValue(dispatch);
    mockCreateSocketConnection.mockReturnValue(mockSocket);

    root = createRoot(container);

    act(() => {
      root?.render(
        <SocketProvider>
          <HookProbe onRender={(socket) => {
            renderedSockets.push(socket);
          }} />
        </SocketProvider>
      );
    });

    expect(mockCreateSocketConnection).toHaveBeenCalledWith(
      'player-123',
      'Player-123',
      'https://robohash.org/player-123',
    );
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CONNECTING' });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(mockUseSocketEvents).toHaveBeenCalledWith(mockSocket);
    expect(renderedSockets.at(-1)).not.toBeNull();

    act(() => {
      root?.unmount();
    });

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});