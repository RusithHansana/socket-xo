// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatContextState } from '../../contexts/chat.context';
import type { GameContextState } from '../../contexts/game.context';
import { ChatDrawer } from './chat-drawer';

const mockUseChatMessages = vi.fn();
const mockUseGuestIdentity = vi.fn();
const mockUseGameState = vi.fn();
const mockUseSocket = vi.fn();

vi.mock('../../hooks/use-chat-messages', () => ({
  useChatMessages: () => mockUseChatMessages(),
}));

vi.mock('../../hooks/use-guest-identity', () => ({
  useGuestIdentity: () => mockUseGuestIdentity(),
}));

vi.mock('../../hooks/use-game-state', () => ({
  useGameState: () => mockUseGameState(),
}));

vi.mock('../../hooks/use-socket', () => ({
  useSocket: () => mockUseSocket(),
}));

type ActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function createChatState(overrides: Partial<ChatContextState> = {}): ChatContextState {
  return {
    messages: [],
    ...overrides,
  };
}

function createGameState(overrides: Partial<GameContextState> = {}): GameContextState {
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

describe('ChatDrawer', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);

    mockUseChatMessages.mockReturnValue(createChatState());
    mockUseGuestIdentity.mockReturnValue({
      playerId: 'player-1',
    });
    mockUseGameState.mockReturnValue(createGameState());
    mockUseSocket.mockReturnValue({ emit: vi.fn() });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });

    root = undefined;
    container.remove();
    mockUseChatMessages.mockReset();
    mockUseGuestIdentity.mockReset();
    mockUseGameState.mockReset();
    mockUseSocket.mockReset();
    (globalThis as ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = undefined;
    vi.restoreAllMocks();
  });

  function renderDrawer(disabled = false) {
    if (root === undefined) {
      root = createRoot(container);
    }

    act(() => {
      root?.render(<ChatDrawer disabled={disabled} />);
    });
  }

  function setInputValue(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('opens drawer, shows placeholder, and marks message log accessibility attributes', () => {
    renderDrawer();

    const trigger = container.querySelector('button[aria-label="Open chat"]');
    expect(trigger).not.toBeNull();

    act(() => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const log = container.querySelector('[role="log"]');
    expect(log?.getAttribute('aria-live')).toBe('polite');
    expect(container.textContent).toContain('No messages yet — say hello!');
  });

  it('sanitizes before emitting send_chat and rejects whitespace-only messages', () => {
    const emit = vi.fn();

    mockUseSocket.mockReturnValue({ emit });
    renderDrawer();

    const trigger = container.querySelector('button[aria-label="Open chat"]');
    act(() => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const input = container.querySelector('input') as HTMLInputElement | null;
    const sendButton = container.querySelector('button[aria-label="Send message"]');

    expect(input).not.toBeNull();

    act(() => {
      if (input) {
        setInputValue(input, '   <b>Hello</b>   ');
      }
    });

    act(() => {
      sendButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(emit).toHaveBeenCalledWith('send_chat', {
      roomId: 'room-123',
      content: 'Hello',
    });

    emit.mockReset();

    act(() => {
      if (input) {
        setInputValue(input, '   \n\t  ');
      }
    });

    act(() => {
      sendButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(emit).not.toHaveBeenCalled();
  });

  it('renders unread badge while collapsed when new messages arrive', () => {
    const firstMessage = {
      id: 'm1',
      playerId: 'player-2',
      displayName: 'Player Two',
      content: 'hello',
      timestamp: Date.now(),
    };

    mockUseChatMessages.mockReturnValue(createChatState({ messages: [] }));
    renderDrawer();

    mockUseChatMessages.mockReturnValue(createChatState({ messages: [firstMessage] }));
    renderDrawer();

    expect(container.textContent).toContain('1');
    const badge = container.querySelector('span[aria-label="1 unread messages"]');
    expect(badge).not.toBeNull();
  });

  it('respects disabled mode', () => {
    renderDrawer(true);

    const trigger = container.querySelector('button[aria-label="Open chat"]') as HTMLButtonElement | null;

    expect(trigger?.disabled).toBe(true);
  });
});
