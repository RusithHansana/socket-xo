/** A single chat message sent by a player in a room. */
export interface ChatMessage {
  /** Unique identifier for this message (UUID). */
  id: string;
  /** The sender's player identifier. */
  playerId: string;
  /** Human-readable name shown in the chat UI. */
  displayName: string;
  /** Sanitised message text. */
  content: string;
  /** Unix epoch timestamp (ms since 1970-01-01T00:00:00Z) for reliable sorting and localised display. */
  timestamp: number;
}
