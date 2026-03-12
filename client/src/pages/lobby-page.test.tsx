// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionState } from '../contexts/connection.context';
import LobbyPage from './lobby-page';

const mockUseGuestIdentity = vi.fn();
const mockUseConnectionStatus = vi.fn();

vi.mock('../hooks/use-guest-identity', () => ({
  useGuestIdentity: () => mockUseGuestIdentity(),
}));

vi.mock('../hooks/use-connection-status', () => ({
  useConnectionStatus: () => mockUseConnectionStatus(),
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
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
    container.remove();
    mockUseGuestIdentity.mockReset();
    mockUseConnectionStatus.mockReset();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
    vi.restoreAllMocks();
  });

  it('renders two mode selection cards', () => {
    renderLobby();

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(container.textContent).toContain('Play Online');
    expect(container.textContent).toContain('Play AI');
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

  it('shows skeleton loading state when connection is idle or connecting', () => {
    mockUseConnectionStatus.mockReturnValue({
      status: 'connecting',
      searching: false,
    } satisfies ConnectionState);

    renderLobby();

    const skeletonCards = container.querySelectorAll('[data-loading="true"]');
    expect(skeletonCards).toHaveLength(2);
    expect(container.textContent).toContain('Player-123');
  });
});