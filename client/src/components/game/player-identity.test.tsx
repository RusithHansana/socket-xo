// @vitest-environment jsdom

import { act } from 'react';
import type { ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PlayerInfo } from 'shared';
import styles from './player-identity.module.css';
import { PlayerIdentity } from './player-identity';

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function createPlayer(overrides: Partial<PlayerInfo> = {}): PlayerInfo {
  return {
    playerId: 'player-1',
    displayName: 'Pilot One',
    avatarUrl: 'https://robohash.org/player-1',
    symbol: 'X',
    connected: true,
    ...overrides,
  };
}

describe('PlayerIdentity', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  function renderIdentity(
    overrides: Partial<ComponentProps<typeof PlayerIdentity>> = {},
  ) {
    const props: ComponentProps<typeof PlayerIdentity> = {
      player: createPlayer(),
      isActive: false,
      ...overrides,
    };

    if (root === undefined) {
      root = createRoot(container);
    }

    act(() => {
      root?.render(<PlayerIdentity {...props} />);
    });

    return props;
  }

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
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
  });

  it('renders the player avatar with the correct src and alt text', () => {
    const player = createPlayer();
    renderIdentity({ player });

    const avatar = container.querySelector('img');

    expect(avatar?.getAttribute('src')).toBe(player.avatarUrl);
    expect(avatar?.getAttribute('alt')).toBe('');
  });

  it('renders the display name and symbol indicator', () => {
    renderIdentity({ player: createPlayer({ symbol: 'O' }) });

    expect(container.textContent).toContain('Pilot One');
    expect(container.textContent).toContain('O');
  });

  it('applies the active glow styling when the player is active', () => {
    renderIdentity({ player: createPlayer({ symbol: 'X' }), isActive: true });

    const avatar = container.querySelector('img');

    expect(avatar?.className).toContain(styles.activeGlowX);
  });

  it('applies the dimmed styling when the player is not active', () => {
    renderIdentity({ isActive: false });

    const identity = container.querySelector('[aria-label]');

    expect(identity?.className).toContain(styles.inactive);
  });

  it('applies disconnected styling and shows a disconnected badge when the player is offline', () => {
    renderIdentity({
      player: createPlayer({ connected: false }),
      isActive: false,
    });

    const identity = container.querySelector('[aria-label]');

    expect(identity?.className).toContain(styles.disconnected);
    expect(container.textContent).toContain('Disconnected');
  });

  it('sets the aria-label for active, waiting, and disconnected states', () => {
    renderIdentity({ player: createPlayer({ symbol: 'X' }), isActive: true });
    expect(container.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe(
      'Player Pilot One, playing as X, active',
    );

    renderIdentity({ player: createPlayer({ symbol: 'O' }), isActive: false });
    expect(container.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe(
      'Player Pilot One, playing as O, waiting',
    );

    renderIdentity({
      player: createPlayer({ symbol: 'O', connected: false }),
      isActive: true,
    });
    expect(container.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe(
      'Player Pilot One, playing as O, disconnected',
    );
  });
});