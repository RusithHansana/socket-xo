import type { PlayerInfo } from './player.types.js';
import type { ChatMessage } from './chat.types.js';

/** The two possible piece symbols a player can be assigned. */
export type Symbol = 'X' | 'O';

/** An n×n grid of cells, each holding a placed Symbol or `null` if empty. */
export type Board = (Symbol | null)[][];

/** Describes the current lifecycle phase of a game room. */
export type GamePhase = 'waiting' | 'playing' | 'finished';

/** A zero-based row/column coordinate on the board. */
export interface Position {
  /** Zero-based row index. */
  row: number;
  /** Zero-based column index. */
  col: number;
}

/** Payload emitted by the client when making a move. */
export interface MovePayload {
  /** The room the move belongs to. */
  roomId: string;
  /** Board cell the player is claiming. */
  position: Position;
}

/** Describes the final result of a completed game. */
export interface GameOutcome {
  /** How the game ended. */
  type: 'win' | 'draw' | 'forfeit';
  /** The winning symbol, or `null` for a draw. */
  winner: Symbol | null;
  /** Ordered list of cells forming the winning line, or `null` for draw/forfeit. */
  winningLine: Position[] | null;
}

/** Full authoritative game state broadcast to all players in a room. */
export interface GameState {
  /** The room this game belongs to. */
  roomId: string;
  /** Current snapshot of the board. */
  board: Board;
  /** Symbol whose turn it is to move. */
  currentTurn: Symbol;
  /** Ordered pair of players — index 0 is X, index 1 is O. */
  players: PlayerInfo[];
  /** Current lifecycle phase. */
  phase: GamePhase;
  /** Populated once the game is finished; `null` while in-progress. */
  outcome: GameOutcome | null;
  /** Total number of moves made so far (used for draw detection). */
  moveCount: number;
  /** Most recent chat messages for this room, provided in authoritative snapshots. */
  chatMessages: ChatMessage[];
}
