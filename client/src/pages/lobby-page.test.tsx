// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionState } from '../contexts/connection.context';
import LobbyPage from './lobby-page';

const mockUseGuestIdentity = vi.fn();
const mockUseConnectionStatus = vi.fn();
const mockUseGameState = vi.fn();
const mockUseSocket = vi.fn();
const mockUseConnectionDispatch = vi.fn();
const mockEmit = vi.fn();
const mockConnectionDispatch = vi.fn();

vi.mock('../hooks/use-guest-identity', () => ({
  useGuestIdentity: () => mockUseGuestIdentity(),
}));

vi.mock('../hooks/use-connection-status', () => ({
  useConnectionStatus: () => mockUseConnectionStatus(),
}));

vi.mock('../hooks/use-game-state', () => ({
  useGameState: () => mockUseGameState(),
}));

vi.mock('../hooks/use-socket', () => ({
  useSocket: () => mockUseSocket(),
}));

vi.mock('../hooks/use-connection-dispatch', () => ({
  useConnectionDispatch: () => mockUseConnectionDispatch(),
}));

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('LobbyPage', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  function renderLobby(initialEntry = '/') {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <LobbyPage />,
        },
        {
          path: '/ai',
          element: <div>AI Destination</div>,
        },
      ],
      { initialEntries: [initialEntry] },
    );

    root = createRoot(container);

    act(() => {
      root?.render(<RouterProvider router={router} />);
    });

    return router;
  }

  beforeEach(() => {
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    mockUseGuestIdentity.mockReturnValue({
      playerId: 'player-123',
      displayName: 'Player-123',
      avatarUrl: 'https://robohash.org/player-123',
    });
    mockUseConnectionStatus.mockReturnValue({
      status: 'connected',
      searching: false,
    } satisfies ConnectionState);
    mockUseGameState.mockReturnValue({
      roomId: null,
      board: [
        [null, null, null],
        [null, null, null],
        [null, null, null],
      ],
      currentTurn: 'X',
      players: [],
      phase: 'waiting',
      outcome: null,
      moveCount: 0,
      lastMoveError: null,
    });
    mockUseSocket.mockReturnValue({ emit: mockEmit });
    mockUseConnectionDispatch.mockReturnValue(mockConnectionDispatch);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
    container.remove();
    mockUseGuestIdentity.mockReset();
    mockUseConnectionStatus.mockReset();
    mockUseGameState.mockReset();
    mockUseSocket.mockReset();
    mockUseConnectionDispatch.mockReset();
    mockEmit.mockReset();
    mockConnectionDispatch.mockReset();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
    vi.restoreAllMocks();
  });

  it('renders two mode selection cards', () => {
    renderLobby();

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
    expect(container.textContent).toContain('Play Online');
    expect(container.textContent).toContain('Play AI');
    expect(container.textContent).toContain('Create Room');
  });

  it('displays the guest identity avatar and name', () => {
    renderLobby();

    const avatar = container.querySelector('img');
    expect(avatar?.getAttribute('src')).toBe('https://robohash.org/player-123');
    expect(avatar?.getAttribute('alt')).toBe('Avatar for Player-123');
    expect(container.textContent).toContain('Player-123');
  });

  it('navigates to /ai when the Play AI card is activated', async () => {
    const router = renderLobby();
    const aiButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Play AI'));

    expect(aiButton).not.toBeUndefined();

    act(() => {
      aiButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await expect.poll(() => router.state.location.pathname).toBe('/ai');
    expect(container.textContent).toContain('AI Destination');
  });

  it('emits join_queue when Play Online is activated', () => {
    renderLobby();

    const onlineButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Play Online'));

    expect(onlineButton).not.toBeUndefined();

    act(() => {
      onlineButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockEmit).toHaveBeenCalledWith('join_queue');
  });

  it('emits create_room when Create Room is activated', () => {
    renderLobby();

    const createRoomButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Create Room'),
    );

    expect(createRoomButton).not.toBeUndefined();

    act(() => {
      createRoomButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockEmit).toHaveBeenCalledWith('create_room');
  });

  it('shows matchmaking indicator when searching', () => {
    mockUseConnectionStatus.mockReturnValue({
      status: 'connected',
      searching: true,
    } satisfies ConnectionState);

    renderLobby();

    expect(container.textContent).toContain('Searching for opponent');
    expect(container.textContent).not.toContain('Play AI');
  });

  it('emits leave_queue and clears searching when cancel is clicked', () => {
    mockUseConnectionStatus.mockReturnValue({
      status: 'connected',
      searching: true,
    } satisfies ConnectionState);

    renderLobby();

    const cancelButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Cancel'));

    expect(cancelButton).not.toBeUndefined();

    act(() => {
      cancelButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockEmit).toHaveBeenCalledWith('leave_queue');
    expect(mockConnectionDispatch).toHaveBeenCalledWith({ type: 'CLEAR_SEARCHING' });
  });

  it('shows matched transition before game navigation', () => {
    vi.useFakeTimers();
    mockUseConnectionStatus.mockReturnValue({
      status: 'in_game',
      searching: false,
    } satisfies ConnectionState);
    mockUseGameState.mockReturnValue({
      roomId: 'room-xyz',
      board: [
        [null, null, null],
        [null, null, null],
        [null, null, null],
      ],
      currentTurn: 'X',
      players: [],
      phase: 'playing',
      outcome: null,
      moveCount: 0,
      lastMoveError: null,
    });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <LobbyPage />,
        },
        {
          path: '/game/:roomId',
          element: <div>Online Destination</div>,
        },
      ],
      { initialEntries: ['/'] },
    );

    root = createRoot(container);

    act(() => {
      root?.render(<RouterProvider router={router} />);
    });

    expect(container.textContent).toContain('Match found!');
    expect(router.state.location.pathname).toBe('/');

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(router.state.location.pathname).toBe('/game/room-xyz');
    vi.useRealTimers();
  });

  it('shows skeleton loading state when connection is idle or connecting', () => {
    mockUseConnectionStatus.mockReturnValue({
      status: 'connecting',
      searching: false,
    } satisfies ConnectionState);

    renderLobby();

    const skeletonCards = container.querySelectorAll('[data-loading="true"]');
    expect(skeletonCards).toHaveLength(3);
    expect(container.textContent).toContain('Player-123');
  });

  it('navigates to /game/:roomId when connection is in_game with an active room', async () => {
    mockUseConnectionStatus.mockReturnValue({
      status: 'in_game',
      searching: false,
    } satisfies ConnectionState);
    mockUseGameState.mockReturnValue({
      roomId: 'room-xyz',
      board: [
        [null, null, null],
        [null, null, null],
        [null, null, null],
      ],
      currentTurn: 'X',
      players: [],
      phase: 'playing',
      outcome: null,
      moveCount: 0,
      lastMoveError: null,
    });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <LobbyPage />,
        },
        {
          path: '/game/:roomId',
          element: <div>Online Destination</div>,
        },
      ],
      { initialEntries: ['/'] },
    );

    root = createRoot(container);

    act(() => {
      root?.render(<RouterProvider router={router} />);
    });

    await expect.poll(() => router.state.location.pathname).toBe('/game/room-xyz');
    expect(container.textContent).toContain('Online Destination');
  });
});