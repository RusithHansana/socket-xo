import type { Symbol } from './game.types';

// 2.1 GuestIdentity interface
export interface GuestIdentity {
  playerId: string;
  displayName: string;
  avatarUrl: string;
}

// 2.2 PlayerInfo interface
export interface PlayerInfo {
  playerId: string;
  displayName: string;
  avatarUrl: string;
  symbol: Symbol;
  connected: boolean;
}

// 2.3 PlayerSession interface
export interface PlayerSession {
  playerId: string;
  socketId: string | null;
  roomId: string | null;
  reconnectToken: string | null;
  connected: boolean;
}
