import { createContext } from 'react';
import type { Board, Symbol, GamePhase, GameOutcome, PlayerInfo } from 'shared';

export interface GameContextState {
  roomId: string | null;
  board: Board;
  currentTurn: Symbol;
  players: PlayerInfo[];
  phase: GamePhase;
  outcome: GameOutcome | null;
  moveCount: number;
}

export function getInitialGameState(): GameContextState {
  return {
    roomId: null,
    board: [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ],
    currentTurn: 'X',
    players: [],
    phase: 'waiting',
    outcome: null,
    moveCount: 0,
  };
}

export const GameContext = createContext<GameContextState | undefined>(undefined);
GameContext.displayName = 'GameContext';
