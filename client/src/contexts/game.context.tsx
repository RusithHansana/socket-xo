import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
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

const initialGameState: GameContextState = {
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

const GameContext = createContext<GameContextState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state] = useState<GameContextState>(initialGameState);
  return <GameContext.Provider value={state}>{children}</GameContext.Provider>;
}

export function useGameState(): GameContextState {
  const ctx = useContext(GameContext);
  if (ctx === undefined) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return ctx;
}
