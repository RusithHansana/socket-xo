import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ClientToServerEvents } from 'shared';
import { SocketContext } from './socket.context';
import { createSocketConnection } from '../services/socket-service';
import type { TypedSocket } from '../services/socket-service';
import { useConnectionDispatch } from '../hooks/use-connection-dispatch';
import { useGuestIdentity } from '../hooks/use-guest-identity';
import { useSocketEvents } from '../hooks/use-socket-events';
import {
  appendDevModeSocketLog,
  getDevModeLagDelayMs,
} from '../services/dev-mode-diagnostics';

function summarizePayload(payload: unknown): string | undefined {
  if (payload === undefined) {
    return undefined;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return '[unserializable payload]';
  }
}

function createInstrumentedSocket(rawSocket: TypedSocket): TypedSocket {
  const emitWithDiagnostics = <TEvent extends keyof ClientToServerEvents>(
    eventName: TEvent,
    ...args: Parameters<ClientToServerEvents[TEvent]>
  ): TypedSocket => {
    appendDevModeSocketLog('outbound', String(eventName), summarizePayload(args[0]));

    const lagDelay = getDevModeLagDelayMs();
    if (lagDelay === null) {
      rawSocket.emit(eventName, ...args);
      return rawSocket;
    }

    globalThis.setTimeout(() => {
      rawSocket.emit(eventName, ...args);
    }, lagDelay);

    return rawSocket;
  };

  return new Proxy(rawSocket, {
    get(target, property, receiver) {
      if (property === 'emit') {
        return emitWithDiagnostics as TypedSocket['emit'];
      }

      return Reflect.get(target, property, receiver);
    },
  }) as TypedSocket;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { playerId, displayName, avatarUrl } = useGuestIdentity();
  const dispatch = useConnectionDispatch();
  const [socket, setSocket] = useState<TypedSocket | null>(() => 
    createSocketConnection(playerId, displayName, avatarUrl)
  );
  const [prevDeps, setPrevDeps] = useState({ playerId, displayName, avatarUrl });
  const instrumentedSocket = useMemo(
    () => {
      if (socket === null) {
        return null;
      }
      return import.meta.env.VITE_DEV_MODE === 'true'
        ? createInstrumentedSocket(socket)
        : socket;
    },
    [socket]
  );

  if (
    playerId !== prevDeps.playerId ||
    displayName !== prevDeps.displayName ||
    avatarUrl !== prevDeps.avatarUrl
  ) {
    setPrevDeps({ playerId, displayName, avatarUrl });
    setSocket(createSocketConnection(playerId, displayName, avatarUrl));
  }

  useEffect(() => {
    if (!instrumentedSocket) return;
    
    dispatch({ type: 'SET_CONNECTING' });
    if (import.meta.env.VITE_DEV_MODE === 'true') {
      appendDevModeSocketLog('lifecycle', 'connect_requested');
    }
    instrumentedSocket.connect();

    return () => {
      if (import.meta.env.VITE_DEV_MODE === 'true') {
        appendDevModeSocketLog('lifecycle', 'disconnect_requested');
      }
      instrumentedSocket.disconnect();
    };
  }, [instrumentedSocket, dispatch]);

  useSocketEvents(instrumentedSocket, playerId);

  return <SocketContext.Provider value={instrumentedSocket}>{children}</SocketContext.Provider>;
}
