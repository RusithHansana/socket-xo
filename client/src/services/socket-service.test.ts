import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TypedSocket } from './socket-service';
import { createSocketConnection } from './socket-service';

const { ioMock } = vi.hoisted(() => ({
  ioMock: vi.fn(),
}));

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

describe('createSocketConnection', () => {
  beforeEach(() => {
    ioMock.mockReset();
  });

  it('creates a typed socket client with auth metadata and autoConnect disabled', () => {
    const socket = { id: 'socket-1' } as TypedSocket;
    ioMock.mockReturnValue(socket);

    const result = createSocketConnection(
      'player-123',
      'Player-123',
      'https://robohash.org/player-123',
    );

    expect(ioMock).toHaveBeenCalledWith({
      autoConnect: false,
      auth: {
        playerId: 'player-123',
        displayName: 'Player-123',
        avatarUrl: 'https://robohash.org/player-123',
      },
    });
    expect(result).toBe(socket);
  });
});