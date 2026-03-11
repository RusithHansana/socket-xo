import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllSessions,
  clearReconnectToken,
  getSession,
  getSessionBySocketId,
  issueReconnectToken,
  markDisconnected,
  rebindSession,
  registerSession,
  removeSession,
  setSessionSocketDisconnectHandler,
  validateReconnectToken,
} from './session-manager.js';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('session-manager', () => {
  beforeEach(() => {
    clearAllSessions();
    setSessionSocketDisconnectHandler(null);
  });

  it('6.2 — registerSession creates a new session with correct fields', () => {
    const session = registerSession('player-1', 'socket-1');

    expect(session).toEqual({
      playerId: 'player-1',
      socketId: 'socket-1',
      roomId: null,
      reconnectToken: null,
      connected: true,
    });
  });

  it('6.3 — registerSession rebinds an existing session and disconnects the previous socket', () => {
    const disconnectSocket = vi.fn();
    setSessionSocketDisconnectHandler(disconnectSocket);
    registerSession('player-1', 'socket-1');

    const session = registerSession('player-1', 'socket-2');

    expect(disconnectSocket).toHaveBeenCalledWith('socket-1');
    expect(session.socketId).toBe('socket-2');
    expect(session.connected).toBe(true);
  });

  it('6.4 — getSession returns session by playerId', () => {
    const createdSession = registerSession('player-1', 'socket-1');

    expect(getSession('player-1')).toBe(createdSession);
  });

  it('6.5 — getSession returns null for unknown playerId', () => {
    expect(getSession('missing-player')).toBeNull();
  });

  it('6.6 — getSessionBySocketId returns correct session', () => {
    const createdSession = registerSession('player-1', 'socket-1');

    expect(getSessionBySocketId('socket-1')).toBe(createdSession);
  });

  it('6.7 — getSessionBySocketId returns null for unknown socketId', () => {
    expect(getSessionBySocketId('missing-socket')).toBeNull();
  });

  it('6.8 — issueReconnectToken generates a UUID and stores it with the roomId', () => {
    registerSession('player-1', 'socket-1');

    const reconnectToken = issueReconnectToken('player-1', 'room-1');
    const session = getSession('player-1');

    expect(reconnectToken).toMatch(UUID_V4_PATTERN);
    expect(session?.roomId).toBe('room-1');
    expect(session?.reconnectToken).toBe(reconnectToken);
  });

  it('6.9 — issueReconnectToken returns null for unknown playerId', () => {
    expect(issueReconnectToken('missing-player', 'room-1')).toBeNull();
  });

  it('6.10 — validateReconnectToken returns session on match', () => {
    registerSession('player-1', 'socket-1');
    const reconnectToken = issueReconnectToken('player-1', 'room-1');

    expect(validateReconnectToken('player-1', reconnectToken ?? '')).toEqual(
      getSession('player-1'),
    );
  });

  it('6.11 — validateReconnectToken returns null on token mismatch', () => {
    registerSession('player-1', 'socket-1');
    issueReconnectToken('player-1', 'room-1');

    expect(validateReconnectToken('player-1', 'invalid-token')).toBeNull();
  });

  it('6.12 — validateReconnectToken returns null on playerId mismatch', () => {
    registerSession('player-1', 'socket-1');
    const reconnectToken = issueReconnectToken('player-1', 'room-1');

    expect(validateReconnectToken('player-2', reconnectToken ?? '')).toBeNull();
  });

  it('6.13 — clearReconnectToken clears the stored token', () => {
    registerSession('player-1', 'socket-1');
    issueReconnectToken('player-1', 'room-1');

    clearReconnectToken('player-1');

    expect(getSession('player-1')?.reconnectToken).toBeNull();
  });

  it('6.14 — markDisconnected clears socketId, sets connected false, and retains roomId', () => {
    registerSession('player-1', 'socket-1');
    const reconnectToken = issueReconnectToken('player-1', 'room-1');

    const session = markDisconnected('socket-1');

    expect(session).toEqual({
      playerId: 'player-1',
      socketId: null,
      roomId: 'room-1',
      reconnectToken,
      connected: false,
    });
  });

  it('6.15 — markDisconnected returns null for unknown socketId', () => {
    expect(markDisconnected('missing-socket')).toBeNull();
  });

  it('6.16 — rebindSession updates socketId and sets connected true', () => {
    registerSession('player-1', 'socket-1');
    issueReconnectToken('player-1', 'room-1');
    markDisconnected('socket-1');

    const session = rebindSession('player-1', 'socket-2');

    expect(session).toEqual({
      playerId: 'player-1',
      socketId: 'socket-2',
      roomId: 'room-1',
      reconnectToken: getSession('player-1')?.reconnectToken ?? null,
      connected: true,
    });
  });

  it('6.17 — removeSession fully deletes the session', () => {
    registerSession('player-1', 'socket-1');

    removeSession('player-1');

    expect(getSession('player-1')).toBeNull();
  });
});