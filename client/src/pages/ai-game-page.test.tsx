// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from 'shared';
import AIGamePage from './ai-game-page';

const mockUseAiGame = vi.fn();

vi.mock('../hooks/use-ai-game', () => ({
  useAiGame: () => mockUseAiGame(),
}));

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function createBaseState(): GameState {
  return {
    roomId: 'ai-room',
    board: [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ],
    currentTurn: 'X',
    players: [
      {
        playerId: 'player-1',
        displayName: 'Player-1',
        avatarUrl: 'https://robohash.org/player-1',
        symbol: 'X',
        connected: true,
      },
      {
        playerId: 'ai',
        displayName: 'AI Opponent',
        avatarUrl: 'https://robohash.org/ai',
        symbol: 'O',
        connected: true,
      },
    ],
    phase: 'playing',
    outcome: null,
    moveCount: 0,
  };
}

describe('AIGamePage', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  function renderPage() {
    const router = createMemoryRouter(
      [
        {
          path: '/ai',
          element: <AIGamePage />,
        },
        {
          path: '/',
          element: <div>Lobby Destination</div>,
        },
      ],
      { initialEntries: ['/ai'] },
    );

    if (root === undefined) {
      root = createRoot(container);
    }

    act(() => {
      root?.render(<RouterProvider router={router} />);
    });

    return router;
  }

  beforeEach(() => {
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    mockUseAiGame.mockReturnValue({
      gameState: createBaseState(),
      playerInfo: {
        playerId: 'player-1',
        displayName: 'Player-1',
        avatarUrl: 'https://robohash.org/player-1',
        symbol: 'X',
        connected: true,
      },
      aiInfo: {
        playerId: 'ai',
        displayName: 'AI Opponent',
        avatarUrl: 'https://robohash.org/ai',
        symbol: 'O',
        connected: true,
      },
      makeMove: vi.fn(),
      resetGame: vi.fn(),
      isConnected: true,
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
    container.remove();
    mockUseAiGame.mockReset();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
    vi.restoreAllMocks();
  });

  it('7.16 — renders the game board, turn indicator, and player identities after game start', () => {
    renderPage();

    expect(container.querySelector('[role="grid"]')).not.toBeNull();
    expect(container.textContent).toContain('Your Turn');
    expect(container.textContent).toContain('Player-1');
    expect(container.textContent).toContain('AI Opponent');
  });

  it('7.17 — clicking a cell emits makeMove and the board reflects the next server state on rerender', () => {
    const initial = createBaseState();
    const updated: GameState = {
      ...initial,
      board: [
        ['X', 'O', null],
        [null, null, null],
        [null, null, null],
      ],
      currentTurn: 'X',
      moveCount: 2,
    };
    const makeMove = vi.fn();

    mockUseAiGame.mockReturnValue({
      gameState: initial,
      playerInfo: {
        playerId: 'player-1',
        displayName: 'Player-1',
        avatarUrl: 'https://robohash.org/player-1',
        symbol: 'X',
        connected: true,
      },
      aiInfo: {
        playerId: 'ai',
        displayName: 'AI Opponent',
        avatarUrl: 'https://robohash.org/ai',
        symbol: 'O',
        connected: true,
      },
      makeMove,
      resetGame: vi.fn(),
      isConnected: true,
    });

    renderPage();

    const firstCell = container.querySelector('#cell-0-0');
    act(() => {
      firstCell?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(makeMove).toHaveBeenCalledWith(0, 0);

    mockUseAiGame.mockReturnValue({
      gameState: updated,
      playerInfo: {
        playerId: 'player-1',
        displayName: 'Player-1',
        avatarUrl: 'https://robohash.org/player-1',
        symbol: 'X',
        connected: true,
      },
      aiInfo: {
        playerId: 'ai',
        displayName: 'AI Opponent',
        avatarUrl: 'https://robohash.org/ai',
        symbol: 'O',
        connected: true,
      },
      makeMove,
      resetGame: vi.fn(),
      isConnected: true,
    });

    renderPage();

    expect(container.querySelector('#cell-0-0')?.getAttribute('aria-label')).toContain('X');
    expect(container.querySelector('#cell-0-1')?.getAttribute('aria-label')).toContain('O');
  });

  it('7.18 — shows the GameOutcomeModal when the game is over', () => {
    mockUseAiGame.mockReturnValue({
      gameState: {
        ...createBaseState(),
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
      },
      playerInfo: {
        playerId: 'player-1',
        displayName: 'Player-1',
        avatarUrl: 'https://robohash.org/player-1',
        symbol: 'X',
        connected: true,
      },
      aiInfo: {
        playerId: 'ai',
        displayName: 'AI Opponent',
        avatarUrl: 'https://robohash.org/ai',
        symbol: 'O',
        connected: true,
      },
      makeMove: vi.fn(),
      resetGame: vi.fn(),
      isConnected: true,
    });

    renderPage();

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.textContent).toContain('You Win!');
  });

  it('7.19 — Back to Lobby navigates to the lobby route', async () => {
    const router = renderPage();
    const backButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Back to Lobby'),
    );

    act(() => {
      backButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await expect.poll(() => router.state.location.pathname).toBe('/');
    expect(container.textContent).toContain('Lobby Destination');
  });
});