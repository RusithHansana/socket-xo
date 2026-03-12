import { useLayoutEffect } from 'react';
import type { GameState } from 'shared';
import { useConnectionDispatch } from './use-connection-dispatch';
import { useGameDispatch } from './use-game-dispatch';
import type { TypedSocket } from '../services/socket-service';

export function useSocketEvents(socket: TypedSocket | null): void {
  const connectionDispatch = useConnectionDispatch();
  const gameDispatch = useGameDispatch();

  useLayoutEffect(() => {
    if (socket === null) {
      return undefined;
    }

    const handleConnect = () => {
      connectionDispatch({ type: 'SET_CONNECTED' });
    };

    const handleDisconnect = () => {
      connectionDispatch({ type: 'SET_DISCONNECTED' });
    };

    const handleConnectError = () => {
      connectionDispatch({ type: 'SET_DISCONNECTED' });
    };

    const handleQueueJoined = () => {
      connectionDispatch({ type: 'SET_SEARCHING' });
    };

    const handleGameStart = (state: GameState) => {
      connectionDispatch({ type: 'SET_IN_GAME' });
      gameDispatch({ type: 'GAME_START', payload: state });
    };

    const handleGameStateUpdate = (state: GameState) => {
      gameDispatch({ type: 'GAME_STATE_UPDATE', payload: state });
    };

    const handleMoveRejected = (payload: { code: string; message: string }) => {
      gameDispatch({ type: 'MOVE_REJECTED', payload });
    };

    const handleGameOver = (state: GameState) => {
      connectionDispatch({ type: 'SET_GAME_OVER' });
      gameDispatch({ type: 'GAME_OVER', payload: state });
    };

    const handleError = (payload: { code: string; message: string }) => {
      console.error('Socket server error', payload);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('queue_joined', handleQueueJoined);
    socket.on('game_start', handleGameStart);
    socket.on('game_state_update', handleGameStateUpdate);
    socket.on('move_rejected', handleMoveRejected);
    socket.on('game_over', handleGameOver);
    socket.on('error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('queue_joined', handleQueueJoined);
      socket.off('game_start', handleGameStart);
      socket.off('game_state_update', handleGameStateUpdate);
      socket.off('move_rejected', handleMoveRejected);
      socket.off('game_over', handleGameOver);
      socket.off('error', handleError);
    };
  }, [connectionDispatch, gameDispatch, socket]);
}