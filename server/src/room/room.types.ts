import type { GameState } from 'shared';

export interface GameRoom {
  roomId: string;
  playerIds: string[];
  state: GameState;
  createdAt: string;
  status: 'waiting' | 'active' | 'completed';
  completedAt: string | null;
  abandonedAt: string | null;
  lastActivityAt: string;
}