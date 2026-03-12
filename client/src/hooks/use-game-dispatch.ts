import { useContext } from 'react';
import type { Dispatch } from 'react';
import { GameContext } from '../contexts/game.context';
import type { GameAction } from '../contexts/game.context';

export function useGameDispatch(): Dispatch<GameAction> {
  const ctx = useContext(GameContext);

  if (ctx === undefined) {
    throw new Error('useGameDispatch must be used within a GameProvider');
  }

  return ctx.dispatch;
}