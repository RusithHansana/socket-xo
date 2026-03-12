import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { GameContext, gameReducer, getInitialGameState } from './game.context';

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, getInitialGameState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
