// 3.1 ChatMessage interface
export interface ChatMessage {
  id: string;
  playerId: string;
  displayName: string;
  content: string;
  timestamp: string; // ISO 8601 string
}
