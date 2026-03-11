import type { GameState } from 'shared';

export interface GameRoom {
  roomId: string;
  playerIds: string[];
  state: GameState;
  createdAt: string;
  status: 'waiting' | 'active' | 'completed';
}