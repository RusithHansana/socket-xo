import type { Symbol } from './game.types';

/** Persistent guest profile stored client-side (localStorage) and sent on connect. */
export interface GuestIdentity {
  /** Stable UUID that identifies the player across sessions. */
  playerId: string;
  /** Randomly-generated display name shown in the UI and chat. */
  displayName: string;
  /** URL of the player's generated avatar image. */
  avatarUrl: string;
}

/** Player information that forms part of the shared `GameState`. */
export interface PlayerInfo {
  /** Stable UUID matching the player's `GuestIdentity.playerId`. */
  playerId: string;
  /** Human-readable name shown in the game UI. */
  displayName: string;
  /** Avatar image URL. */
  avatarUrl: string;
  /** Board symbol assigned to this player for the current game. */
  symbol: Symbol;
  /** `true` when the player's socket is currently connected. */
  connected: boolean;
}

/** Server-side session record maintained per connected socket. */
export interface PlayerSession {
  /** Stable player UUID from `GuestIdentity`. */
  playerId: string;
  /** Currently active Socket.IO socket id, or `null` if disconnected. */
  socketId: string | null;
  /** Room the player is currently in, or `null` if in the lobby. */
  roomId: string | null;
  /** Short-lived token used to re-associate a reconnecting socket with this session. */
  reconnectToken: string | null;
  /** `true` when the player's socket is live. */
  connected: boolean;
}
