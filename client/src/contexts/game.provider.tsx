import { useState } from 'react';
import type { ReactNode } from 'react';
import { GameContext, getInitialGameState } from './game.context';
import type { GameContextState } from './game.context';

export function GameProvider({ children }: { children: ReactNode }) {
  const [state] = useState<GameContextState>(getInitialGameState);
  return <GameContext.Provider value={state}>{children}</GameContext.Provider>;
}
