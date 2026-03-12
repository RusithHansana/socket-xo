import { useContext } from 'react';
import { GameContext } from '../contexts/game.context';
import type { GameContextState } from '../contexts/game.context';

export function useGameState(): GameContextState {
  const ctx = useContext(GameContext);
  if (ctx === undefined) {
    throw new Error('useGameState must be used within a GameProvider');
  }

  return ctx.state;
}
