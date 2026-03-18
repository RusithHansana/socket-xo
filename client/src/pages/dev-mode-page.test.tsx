// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionState } from '../contexts/connection.context';
import type { GameContextState } from '../contexts/game.context';
import DevModePage from './dev-mode-page';

const mockUseConnectionStatus = vi.fn();
const mockUseGameState = vi.fn();
const mockUseSocket = vi.fn();
const mockUseDevModeDiagnostics = vi.fn();

vi.mock('../hooks/use-connection-status', () => ({
  useConnectionStatus: () => mockUseConnectionStatus(),
}));

vi.mock('../hooks/use-game-state', () => ({
  useGameState: () => mockUseGameState(),
}));

vi.mock('../hooks/use-socket', () => ({
  useSocket: () => mockUseSocket(),
}));

vi.mock('../hooks/use-dev-mode-diagnostics', () => ({
  useDevModeDiagnostics: () => mockUseDevModeDiagnostics(),
}));

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function buildGameState(overrides: Partial<GameContextState> = {}): GameContextState {
  return {
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
    opponentDisconnect: null,
    reconnectError: null,
    roomError: null,
    ...overrides,
  };
}

describe('DevModePage', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  const disconnect = vi.fn();
  const connect = vi.fn();

  function renderPage(initialEntry = '/test-lab') {
    const router = createMemoryRouter(
      [
        {
          path: '/test-lab',
          element: <DevModePage />,
        },
        {
          path: '/',
          element: <div>Lobby</div>,
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

    mockUseConnectionStatus.mockReturnValue({
      status: 'connected',
      searching: false,
    } satisfies ConnectionState);
    mockUseGameState.mockReturnValue(buildGameState());
    mockUseSocket.mockReturnValue({ disconnect, connect });
    mockUseDevModeDiagnostics.mockReturnValue({
      state: {
        lagEnabled: false,
        lagDelayMs: 1000,
        socketLogs: [],
      },
      setLagEnabled: vi.fn(),
      setLagDelayMs: vi.fn(),
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
    container.remove();
    disconnect.mockReset();
    connect.mockReset();
    mockUseConnectionStatus.mockReset();
    mockUseGameState.mockReset();
    mockUseSocket.mockReset();
    mockUseDevModeDiagnostics.mockReset();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
  });

  it('renders a live socket log region with role="log"', () => {
    renderPage();

    const logRegion = container.querySelector('[role="log"]');
    expect(logRegion).not.toBeNull();
  });

  it('shows idle placeholder when there is no active game and no log entries', () => {
    mockUseGameState.mockReturnValue(buildGameState({ phase: 'waiting' }));
    renderPage();

    expect(container.textContent).toContain('Start a game to see live socket events');
  });

  it('forces client disconnect when Simulate Disconnect is clicked', () => {
    renderPage();

    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes('Simulate Disconnect'),
    );

    expect(button).not.toBeUndefined();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
