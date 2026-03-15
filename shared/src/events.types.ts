import type { GameState, MovePayload } from './game.types';
import type { ChatMessage } from './chat.types';

/** Inter-server events — empty for single-server MVP. Reserved for future horizontal scaling. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InterServerEvents {}

/** Per-socket metadata attached by the server on connection and available in every event handler. */
export interface SocketData {
  playerId: string;
  roomId: string | null;
}

/**
 * Events emitted **by the client** and handled by the server.
 * All event names use `snake_case` verb_noun convention; payload fields use `camelCase`.
 */
export interface ClientToServerEvents {
  /** Join the matchmaking queue */
  join_queue: () => void;
  /** Leave the matchmaking queue */
  leave_queue: () => void;
  /** Start a solo AI game */
  start_ai_game: () => void;
  /** Submit a board move */
  make_move: (payload: MovePayload) => void;
  /** Send a chat message in a room */
  send_chat: (payload: { roomId: string; content: string }) => void;
  /** Attempt to reconnect an existing session */
  reconnect_attempt: (payload: { playerId: string; reconnectToken: string }) => void;
  /** Join a specific room by link */
  join_room: (payload: { roomId: string; playerId: string }) => void;
}

/**
 * Events emitted **by the server** and handled by the client.
 * All event names use `snake_case` verb_noun convention; payload fields use `camelCase`.
 */
export interface ServerToClientEvents {
  /** Acknowledged: player entered queue */
  queue_joined: () => void;
  /** A match was found and the game is starting */
  game_start: (state: GameState) => void;
  /** Authoritative board state after any move */
  game_state_update: (state: GameState) => void;
  /** The server rejected a move */
  move_rejected: (payload: { code: string; message: string }) => void;
  /** Game has ended — outcome populated in state */
  game_over: (state: GameState) => void;
  /** A player disconnected; grace period started */
  player_disconnected: (payload: { playerId: string; gracePeriodMs: number }) => void;
  /** A disconnected player successfully reconnected */
  player_reconnected: (payload: { playerId: string }) => void;
  /** Reconnection was successful; full state snapshot provided */
  reconnect_success: (state: GameState) => void;
  /** Newly issued reconnect token for subsequent reconnect attempts */
  reconnect_token: (payload: { reconnectToken: string }) => void;
  /** Reconnection attempt failed */
  reconnect_failed: (payload: { code: string; message: string }) => void;
  /** A chat message was broadcast to the room */
  chat_message: (message: ChatMessage) => void;
  /** Generic error from the server */
  error: (payload: { code: string; message: string }) => void;
}
