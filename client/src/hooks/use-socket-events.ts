import { useLayoutEffect } from 'react';
import type { GameState, ChatMessage } from 'shared';
import { useConnectionDispatch } from './use-connection-dispatch';
import { useGameDispatch } from './use-game-dispatch';
import { useChatDispatch } from './use-chat-dispatch';
import type { TypedSocket } from '../services/socket-service';
import {
  clearReconnectToken,
  getReconnectToken,
  storeReconnectToken,
} from '../services/reconnect-token-service';

const ROOM_ERROR_CODES = new Set(['ROOM_NOT_FOUND', 'ROOM_FULL', 'GAME_ENDED', 'ALREADY_IN_GAME']);

export function useSocketEvents(socket: TypedSocket | null, playerId: string): void {
  const connectionDispatch = useConnectionDispatch();
  const gameDispatch = useGameDispatch();
  const chatDispatch = useChatDispatch();

  useLayoutEffect(() => {
    if (socket === null) {
      return undefined;
    }

    const handleConnect = () => {
      const reconnectToken = getReconnectToken(playerId);

      if (reconnectToken !== null) {
        connectionDispatch({ type: 'SET_RECONNECTING' });
        socket.emit('reconnect_attempt', { playerId, reconnectToken });
        return;
      }

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
      chatDispatch({ type: 'CHAT_SNAPSHOT_REPLACED', payload: state.chatMessages });
    };

    const handleGameStateUpdate = (state: GameState) => {
      gameDispatch({ type: 'GAME_STATE_UPDATE', payload: state });
      chatDispatch({ type: 'CHAT_SNAPSHOT_REPLACED', payload: state.chatMessages });
    };

    const handleMoveRejected = (payload: { code: string; message: string }) => {
      gameDispatch({ type: 'MOVE_REJECTED', payload });
    };

    const handleRoomCreated = (payload: { roomId: string }) => {
      gameDispatch({ type: 'ROOM_CREATED', payload });
      connectionDispatch({ type: 'SET_IN_GAME' });
    };

    const handleGameOver = (state: GameState) => {
      clearReconnectToken(playerId);
      connectionDispatch({ type: 'SET_GAME_OVER' });
      gameDispatch({ type: 'GAME_OVER', payload: state });
    };

    const handlePlayerDisconnected = (payload: { playerId: string; gracePeriodMs: number }) => {
      gameDispatch({ type: 'OPPONENT_DISCONNECTED', payload });
    };

    const handlePlayerReconnected = () => {
      gameDispatch({ type: 'OPPONENT_RECONNECTED' });
    };

    const handleReconnectSuccess = (state: GameState) => {
      connectionDispatch({ type: 'SET_IN_GAME' });
      gameDispatch({ type: 'GAME_STATE_UPDATE', payload: state });
      gameDispatch({ type: 'OPPONENT_RECONNECTED' });
      chatDispatch({ type: 'CHAT_SNAPSHOT_REPLACED', payload: state.chatMessages });
    };

    const handleReconnectFailed = (payload: { code: string; message: string }) => {
      clearReconnectToken(playerId);
      connectionDispatch({ type: 'SET_GAME_OVER' });
      gameDispatch({ type: 'RECONNECT_FAILED', payload });
    };

    const handleReconnectToken = (payload: { reconnectToken: string }) => {
      storeReconnectToken(playerId, payload.reconnectToken);
    };

    const handleError = (payload: { code: string; message: string }) => {
      if (ROOM_ERROR_CODES.has(payload.code)) {
        gameDispatch({ type: 'SET_ROOM_ERROR', payload });
      }

      console.error('Socket server error', payload);
    };

    const handleChatMessage = (message: ChatMessage) => {
      chatDispatch({ type: 'CHAT_MESSAGE_RECEIVED', payload: message });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('queue_joined', handleQueueJoined);
    socket.on('game_start', handleGameStart);
    socket.on('game_state_update', handleGameStateUpdate);
    socket.on('move_rejected', handleMoveRejected);
    socket.on('room_created', handleRoomCreated);
    socket.on('game_over', handleGameOver);
    socket.on('player_disconnected', handlePlayerDisconnected);
    socket.on('player_reconnected', handlePlayerReconnected);
    socket.on('reconnect_success', handleReconnectSuccess);
    socket.on('reconnect_failed', handleReconnectFailed);
    socket.on('reconnect_token', handleReconnectToken);
    socket.on('chat_message', handleChatMessage);
    socket.on('error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('queue_joined', handleQueueJoined);
      socket.off('game_start', handleGameStart);
      socket.off('game_state_update', handleGameStateUpdate);
      socket.off('move_rejected', handleMoveRejected);
      socket.off('room_created', handleRoomCreated);
      socket.off('game_over', handleGameOver);
      socket.off('player_disconnected', handlePlayerDisconnected);
      socket.off('player_reconnected', handlePlayerReconnected);
      socket.off('reconnect_success', handleReconnectSuccess);
      socket.off('reconnect_failed', handleReconnectFailed);
      socket.off('reconnect_token', handleReconnectToken);
      socket.off('chat_message', handleChatMessage);
      socket.off('error', handleError);
    };
  }, [connectionDispatch, gameDispatch, chatDispatch, playerId, socket]);
}