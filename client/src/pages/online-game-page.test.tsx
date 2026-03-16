// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionState } from '../contexts/connection.context';
import type { GameContextState } from '../contexts/game.context';
import OnlineGamePage from './online-game-page';

const mockUseGameState = vi.fn();
const mockUseConnectionStatus = vi.fn();
const mockUseGuestIdentity = vi.fn();
const mockUseSocket = vi.fn();
const mockUseGameDispatch = vi.fn();
const mockUseConnectionDispatch = vi.fn();
const mockGetReconnectToken = vi.fn();

vi.mock('../hooks/use-game-state', () => ({
  useGameState: () => mockUseGameState(),
}));

vi.mock('../hooks/use-connection-status', () => ({
  useConnectionStatus: () => mockUseConnectionStatus(),
}));

vi.mock('../hooks/use-guest-identity', () => ({
  useGuestIdentity: () => mockUseGuestIdentity(),
}));

vi.mock('../hooks/use-socket', () => ({
  useSocket: () => mockUseSocket(),
}));

vi.mock('../hooks/use-game-dispatch', () => ({
  useGameDispatch: () => mockUseGameDispatch(),
}));

vi.mock('../hooks/use-connection-dispatch', () => ({
  useConnectionDispatch: () => mockUseConnectionDispatch(),
}));

vi.mock('../services/reconnect-token-service', async () => {
  const actual = await vi.importActual('../services/reconnect-token-service');

  return {
    ...actual,
    getReconnectToken: (playerId: string) => mockGetReconnectToken(playerId),
  };
});

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function createState(overrides: Partial<GameContextState> = {}): GameContextState {
  return {
    roomId: 'room-123',
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
    lastMoveError: null,
    opponentDisconnect: null,
    reconnectError: null,
    roomError: null,
    ...overrides,
  };
}

describe('OnlineGamePage', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  const gameDispatch = vi.fn();
  const connectionDispatch = vi.fn();

  async function renderPage(initialEntry = '/game/room-123') {
    const router = createMemoryRouter(
      [
        {
          path: '/game/:roomId',
          loader: ({ params }) => ({ roomId: params.roomId ?? '' }),
          HydrateFallback: () => null,
          element: <OnlineGamePage />,
        },
        {
          path: '/',
          element: <div>Lobby Destination</div>,
        },
      ],
      { initialEntries: [initialEntry] },
    );

    if (root === undefined) {
      root = createRoot(container);
    }

    await act(async () => {
      root?.render(<RouterProvider router={router} />);
    });

    return router;
  }

  beforeEach(() => {
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);

    mockUseGameState.mockReturnValue(createState());
    mockUseConnectionStatus.mockReturnValue({
      status: 'in_game',
      searching: false,
    } satisfies ConnectionState);
    mockUseGuestIdentity.mockReturnValue({
      playerId: 'player-1',
      displayName: 'Player One',
      avatarUrl: 'https://robohash.org/player-1',
    });
    mockUseSocket.mockReturnValue({ emit: vi.fn() });
    mockUseGameDispatch.mockReturnValue(gameDispatch);
    mockUseConnectionDispatch.mockReturnValue(connectionDispatch);
    mockGetReconnectToken.mockReturnValue(null);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });

    root = undefined;
    container.remove();
    gameDispatch.mockReset();
    connectionDispatch.mockReset();
    mockUseGameState.mockReset();
    mockUseConnectionStatus.mockReset();
    mockUseGuestIdentity.mockReset();
    mockUseSocket.mockReset();
    mockUseGameDispatch.mockReset();
    mockUseConnectionDispatch.mockReset();
    mockGetReconnectToken.mockReset();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
    vi.restoreAllMocks();
  });

  it('emits join_room with route roomId when user is connected and not already in the room', async () => {
    const emit = vi.fn();

    mockUseSocket.mockReturnValue({ emit });
    mockUseConnectionStatus.mockReturnValue({
      status: 'connected',
      searching: false,
    } satisfies ConnectionState);
    mockUseGameState.mockReturnValue(createState({ roomId: null, phase: 'waiting' }));

    await renderPage('/game/room-link-42');

    expect(emit).toHaveBeenCalledWith('join_room', {
      roomId: 'room-link-42',
      playerId: 'player-1',
    });
  });

  it('does not emit join_room when already in the same room', async () => {
    const emit = vi.fn();

    mockUseSocket.mockReturnValue({ emit });
    mockUseConnectionStatus.mockReturnValue({
      status: 'connected',
      searching: false,
    } satisfies ConnectionState);
    mockUseGameState.mockReturnValue(createState({ roomId: 'room-123', phase: 'waiting' }));

    await renderPage('/game/room-123');

    expect(emit).not.toHaveBeenCalledWith('join_room', expect.anything());
  });

  it('does not emit join_room when reconnect token exists', async () => {
    const emit = vi.fn();

    mockGetReconnectToken.mockReturnValue('token-abc');
    mockUseSocket.mockReturnValue({ emit });
    mockUseConnectionStatus.mockReturnValue({
      status: 'connected',
      searching: false,
    } satisfies ConnectionState);
    mockUseGameState.mockReturnValue(createState({ roomId: null, phase: 'waiting' }));

    await renderPage('/game/room-link-42');

    expect(emit).not.toHaveBeenCalledWith('join_room', expect.anything());
  });

  it('renders loading state while socket is still connecting', async () => {
    mockUseGameState.mockReturnValue(createState({ phase: 'playing' }));
    mockUseConnectionStatus.mockReturnValue({
      status: 'connecting',
      searching: false,
    } satisfies ConnectionState);

    await renderPage();

    expect(container.textContent).toContain('Connecting');
    expect(container.textContent).toContain('Preparing your online match');
  });

  it('shows waiting-for-opponent state with room link and copy button', async () => {
    mockUseGameState.mockReturnValue(createState({ phase: 'waiting', roomId: 'room-link-42' }));

    await renderPage('/game/room-link-42');

    expect(container.textContent).toContain('Waiting for opponent');
    expect(container.textContent).toContain('/game/room-link-42');
    expect(container.textContent).toContain('Copy Link');
  });

  it('shows room error card and go-to-lobby CTA for ROOM_NOT_FOUND', async () => {
    mockUseGameState.mockReturnValue(
      createState({
        phase: 'waiting',
        roomError: {
          code: 'ROOM_NOT_FOUND',
          message: "This room doesn't exist or has expired.",
        },
      }),
    );

    await renderPage();

    expect(container.textContent).toContain("This room doesn't exist or has expired.");
    expect(container.textContent).toContain('Go to Lobby');
  });

  it('renders board, players, and turn indicator from context state', async () => {
    await renderPage();

    expect(container.querySelector('[role="grid"]')).not.toBeNull();
    expect(container.textContent).toContain('Player One');
    expect(container.textContent).toContain('Player Two');
    expect(container.textContent).toContain('Your Turn');
  });

  it('emits make_move payload with roomId and position on cell click', async () => {
    const emit = vi.fn();
    mockUseSocket.mockReturnValue({ emit });

    await renderPage();

    const firstCell = container.querySelector('#cell-0-0');
    act(() => {
      firstCell?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(emit).toHaveBeenCalledWith('make_move', {
      roomId: 'room-123',
      position: { row: 0, col: 0 },
    });
  });

  it('shows game outcome modal when outcome exists', async () => {
    mockUseGameState.mockReturnValue(
      createState({
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
      }),
    );

    await renderPage();

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.textContent).toContain('Back to Lobby');
  });

  it('renders reconnect overlay while disconnected mid-game', async () => {
    mockUseGameState.mockReturnValue(
      createState({
        reconnectError: null,
      }),
    );
    mockUseConnectionStatus.mockReturnValue({
      status: 'disconnected',
      searching: false,
    } satisfies ConnectionState);

    await renderPage();

    expect(container.textContent).toContain('Reconnecting…');
    expect(container.textContent).toContain('0:30');
  });

  it('shows reconnect failure overlay state with lobby action', async () => {
    mockUseGameState.mockReturnValue(
      createState({
        reconnectError: {
          code: 'GAME_ENDED',
          message: 'Game ended during disconnect window',
        },
      }),
    );
    mockUseConnectionStatus.mockReturnValue({
      status: 'game_over',
      searching: false,
    } satisfies ConnectionState);

    await renderPage();

    expect(container.textContent).toContain('Connection could not be restored');
    expect(container.textContent).toContain('Game ended during disconnect window');
  });

  it('renders opponent disconnect banner while waiting for opponent reconnect', async () => {
    mockUseGameState.mockReturnValue(
      createState({
        opponentDisconnect: {
          playerId: 'player-2',
          gracePeriodMs: 30000,
        },
      }),
    );

    await renderPage();

    expect(container.textContent).toContain('Opponent disconnected');
    expect(container.textContent).toContain('0:30');
  });

  it('resets game and connection contexts before navigating back to lobby', async () => {
    const router = await renderPage();

    const backButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Back to Lobby'),
    );

    act(() => {
      backButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(gameDispatch).toHaveBeenCalledWith({ type: 'RESET' });
    expect(connectionDispatch).toHaveBeenCalledWith({ type: 'LEAVE_GAME' });
    await expect.poll(() => router.state.location.pathname).toBe('/');
  });
});
