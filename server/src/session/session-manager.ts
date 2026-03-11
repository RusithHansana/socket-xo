import { randomUUID } from 'node:crypto';
import type { PlayerSession } from 'shared';

type SocketDisconnectHandler = (socketId: string) => void;

const sessions = new Map<string, PlayerSession>();

let socketDisconnectHandler: SocketDisconnectHandler | null = null;

function disconnectPreviousSocket(session: PlayerSession, nextSocketId: string): void {
  if (
    session.connected &&
    session.socketId !== null &&
    session.socketId !== nextSocketId
  ) {
    socketDisconnectHandler?.(session.socketId);
  }
}

export function setSessionSocketDisconnectHandler(
  handler: SocketDisconnectHandler | null,
): void {
  socketDisconnectHandler = handler;
}

export function registerSession(playerId: string, socketId: string): PlayerSession {
  const existingSession = getSession(playerId);

  if (existingSession !== null) {
    disconnectPreviousSocket(existingSession, socketId);

    const updatedSession: PlayerSession = {
      ...existingSession,
      socketId,
      connected: true,
    };

    sessions.set(playerId, updatedSession);
    return updatedSession;
  }

  const session: PlayerSession = {
    playerId,
    socketId,
    roomId: null,
    reconnectToken: null,
    connected: true,
  };

  sessions.set(playerId, session);
  return session;
}

export function getSession(playerId: string): PlayerSession | null {
  return sessions.get(playerId) ?? null;
}

export function getSessionBySocketId(socketId: string): PlayerSession | null {
  for (const session of sessions.values()) {
    if (session.socketId === socketId) {
      return session;
    }
  }

  return null;
}

export function removeSession(playerId: string): void {
  sessions.delete(playerId);
}

export function issueReconnectToken(playerId: string, roomId: string): string | null {
  const session = getSession(playerId);

  if (session === null) {
    return null;
  }

  const reconnectToken = randomUUID();
  const updatedSession: PlayerSession = {
    ...session,
    roomId,
    reconnectToken,
  };

  sessions.set(playerId, updatedSession);
  return reconnectToken;
}

export function validateReconnectToken(
  playerId: string,
  reconnectToken: string,
): PlayerSession | null {
  const session = getSession(playerId);

  if (session === null || session.reconnectToken !== reconnectToken) {
    return null;
  }

  return session;
}

export function clearReconnectToken(playerId: string): void {
  const session = getSession(playerId);

  if (session === null) {
    return;
  }

  sessions.set(playerId, {
    ...session,
    reconnectToken: null,
  });
}

export function markDisconnected(socketId: string): PlayerSession | null {
  const session = getSessionBySocketId(socketId);

  if (session === null) {
    return null;
  }

  const updatedSession: PlayerSession = {
    ...session,
    socketId: null,
    connected: false,
  };

  sessions.set(updatedSession.playerId, updatedSession);
  return updatedSession;
}

export function rebindSession(playerId: string, newSocketId: string): PlayerSession | null {
  const session = getSession(playerId);

  if (session === null) {
    return null;
  }

  disconnectPreviousSocket(session, newSocketId);

  const updatedSession: PlayerSession = {
    ...session,
    socketId: newSocketId,
    connected: true,
  };

  sessions.set(playerId, updatedSession);
  return updatedSession;
}

export function clearAllSessions(): void {
  sessions.clear();
}