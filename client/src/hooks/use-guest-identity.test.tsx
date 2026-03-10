// @vitest-environment jsdom

import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuestIdentity } from 'shared';
import { useGuestIdentity } from './use-guest-identity';

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function HookProbe({
  onRender,
}: {
  onRender: (identity: GuestIdentity) => void;
}): ReactElement | null {
  onRender(useGuestIdentity());
  return null;
}

describe('useGuestIdentity', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
    container.remove();
    localStorage.clear();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
    vi.restoreAllMocks();
  });

  it('returns playerId, displayName, and avatarUrl', () => {
    const playerId = '550e8400-e29b-41d4-a716-446655440000';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(playerId);
    let identity: GuestIdentity | undefined;

    root = createRoot(container);

    act(() => {
      root?.render(<HookProbe onRender={(value) => {
        identity = value;
      }} />);
    });

    expect(identity).toEqual({
      playerId,
      displayName: 'Player-550e',
      avatarUrl: `https://robohash.org/${playerId}`,
    });
  });

  it('returns the same identity on re-render', () => {
    const playerId = '550e8400-e29b-41d4-a716-446655440000';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(playerId);
    let identity: GuestIdentity | undefined;

    root = createRoot(container);

    act(() => {
      root?.render(<HookProbe onRender={(value) => {
        identity = value;
      }} />);
    });

    const firstIdentity = identity;

    act(() => {
      root?.render(<HookProbe onRender={(value) => {
        identity = value;
      }} />);
    });

    expect(identity).toEqual(firstIdentity);
    expect(identity).toBe(firstIdentity);
  });
});