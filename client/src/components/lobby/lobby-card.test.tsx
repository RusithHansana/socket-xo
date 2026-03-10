// @vitest-environment jsdom

import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyCard } from './lobby-card';

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('LobbyCard', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  function renderCard(element: ReactElement) {
    root = createRoot(container);

    act(() => {
      root?.render(element);
    });
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
    vi.restoreAllMocks();
  });

  it('renders the card title and description', () => {
    renderCard(
      <LobbyCard
        title="Play Online"
        description="Find an opponent and start a live match."
        icon={<span aria-hidden="true">O</span>}
        onClick={() => {}}
      />,
    );

    expect(container.textContent).toContain('Play Online');
    expect(container.textContent).toContain('Find an opponent and start a live match.');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();

    renderCard(
      <LobbyCard
        title="Play AI"
        description="Challenge the AI in a solo match."
        icon={<span aria-hidden="true">A</span>}
        onClick={onClick}
      />,
    );

    const button = container.querySelector('button');
    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a skeleton state when loading is true', () => {
    renderCard(
      <LobbyCard
        title="Play AI"
        description="Challenge the AI in a solo match."
        icon={<span aria-hidden="true">A</span>}
        onClick={() => {}}
        loading
      />,
    );

    const skeleton = container.querySelector('[data-loading="true"]');
    expect(skeleton).not.toBeNull();
    expect(container.textContent).not.toContain('Play AI');
  });

  it('triggers onClick for keyboard Enter and Space interactions', () => {
    const onClick = vi.fn();

    renderCard(
      <LobbyCard
        title="Play Online"
        description="Find an opponent and start a live match."
        icon={<span aria-hidden="true">O</span>}
        onClick={onClick}
      />,
    );

    const button = container.querySelector('button');
    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      button?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(onClick).toHaveBeenCalledTimes(2);
  });
});