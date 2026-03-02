import type { PlayerInfo } from './player.types';

// 1.1 Symbol type
export type Symbol = 'X' | 'O';

// 1.2 Board type — n×n grid
export type Board = (Symbol | null)[][];

// 1.3 GamePhase type
export type GamePhase = 'waiting' | 'playing' | 'finished';

// 1.6 Position type
export interface Position {
  row: number;
  col: number;
}

// 1.7 MovePayload type
export interface MovePayload {
  roomId: string;
  position: Position;
}

// 1.4 GameOutcome type
export interface GameOutcome {
  type: 'win' | 'draw' | 'forfeit';
  winner: Symbol | null; // null for draw
  winningLine: Position[] | null; // null for draw/forfeit
}

// 1.5 GameState interface
export interface GameState {
  roomId: string;
  board: Board;
  currentTurn: Symbol;
  players: PlayerInfo[];
  phase: GamePhase;
  outcome: GameOutcome | null;
  moveCount: number;
}
