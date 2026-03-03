import { useState } from 'react';
import type { ReactNode } from 'react';
import { GameContext, initialGameState } from './game.context';
import type { GameContextState } from './game.context';

export function GameProvider({ children }: { children: ReactNode }) {
  const [state] = useState<GameContextState>(initialGameState);
  return <GameContext.Provider value={state}>{children}</GameContext.Provider>;
}
