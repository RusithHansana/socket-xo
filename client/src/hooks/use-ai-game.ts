import { useEffect, useRef, useState, useCallback} from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  GameState,
  PlayerInfo,
  ServerToClientEvents,
} from 'shared';
import { useGuestIdentity } from './use-guest-identity';

const AI_INFO: PlayerInfo = {
  playerId: 'ai',
  displayName: 'AI Opponent',
  avatarUrl: 'https://robohash.org/ai',
  symbol: 'O',
  connected: true,
};

function createSocket(
  playerId: string,
  displayName: string,
  avatarUrl: string,
): Socket<ServerToClientEvents, ClientToServerEvents> {
  return io({
    autoConnect: false,
    auth: {
      playerId,
      displayName,
      avatarUrl,
    },
  });
}

export interface UseAiGameResult {
  gameState: GameState | null;
  playerInfo: PlayerInfo;
  aiInfo: PlayerInfo;
  makeMove: (row: number, col: number) => void;
  resetGame: () => void;
  isConnected: boolean;
}

export function useAiGame(): UseAiGameResult {
  const identity = useGuestIdentity();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [, setLastMoveError] = useState<{ code: string; message: string } | null>(null);

  const playerInfo: PlayerInfo = {
    playerId: identity.playerId,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    symbol: 'X',
    connected: true,
  };

  useEffect(() => {
    const socket = createSocket(identity.playerId, identity.displayName, identity.avatarUrl);
    socketRef.current = socket;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('start_ai_game');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleGameStart = (state: GameState) => {
      setGameState(state);
      setLastMoveError(null);
    };

    const handleGameStateUpdate = (state: GameState) => {
      setGameState(state);
      setLastMoveError(null);
    };

    const handleGameOver = (state: GameState) => {
      setGameState(state);
      setLastMoveError(null);
    };

    const handleMoveRejected = (error: { code: string; message: string }) => {
      setLastMoveError(error);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('game_start', handleGameStart);
    socket.on('game_state_update', handleGameStateUpdate);
    socket.on('game_over', handleGameOver);
    socket.on('move_rejected', handleMoveRejected);

    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('game_start', handleGameStart);
      socket.off('game_state_update', handleGameStateUpdate);
      socket.off('game_over', handleGameOver);
      socket.off('move_rejected', handleMoveRejected);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [identity.avatarUrl, identity.displayName, identity.playerId]);

  const makeMove = useCallback((row: number, col: number) => {
    const socket = socketRef.current;

    if (socket === null || gameState === null) {
      return;
    }

    socket.emit('make_move', {
      roomId: gameState.roomId,
      position: { row, col },
    });
  }, [gameState]);

  const resetGame = () => {
    socketRef.current?.emit('start_ai_game');
  };

  return {
    gameState,
    playerInfo,
    aiInfo: AI_INFO,
    makeMove,
    resetGame,
    isConnected,
  };
}