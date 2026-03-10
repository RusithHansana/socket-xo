import type { GameState, Position } from 'shared';
import type { PlayerInfo } from 'shared';
import { applyMove, checkOutcome, createGame, validateMove } from './game-engine.js';
import { getBestMove } from './ai-engine.js';

const AI_PLAYER: PlayerInfo = {
  playerId: 'ai',
  displayName: 'AI Opponent',
  avatarUrl: 'https://robohash.org/ai',
  symbol: 'O',
  connected: true,
};

const aiGames = new Map<string, GameState>();

export interface AiGameError {
  code: string;
  message: string;
}

export interface StartAiGameResult {
  state: GameState | null;
  error: AiGameError | null;
}

export interface HandleAiMoveResult {
  playerState: GameState | null;
  aiState: GameState | null;
  error: AiGameError | null;
}

export interface CleanupAiGameResult {
  error: AiGameError | null;
}

function toStructuredError(code: string, error: unknown, fallbackMessage: string): AiGameError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return {
      code: (error as { code: string }).code,
      message: (error as { message: string }).message,
    };
  }

  if (error instanceof Error && error.message.trim() !== '') {
    return { code, message: error.message };
  }

  return { code, message: fallbackMessage };
}

function createPlayer(playerId: string, displayName: string, avatarUrl: string): PlayerInfo {
  return {
    playerId,
    displayName,
    avatarUrl,
    symbol: 'X',
    connected: true,
  };
}

export function isAiGame(socketId: string): boolean {
  return aiGames.has(socketId);
}

export function startAiGame(
  socketId: string,
  playerId: string,
  displayName: string,
  avatarUrl: string,
): StartAiGameResult {
  try {
    const player = createPlayer(playerId, displayName, avatarUrl);
    const state = createGame(`ai-${socketId}`, [player, AI_PLAYER]);
    aiGames.set(socketId, state);

    return { state, error: null };
  } catch (error) {
    return {
      state: null,
      error: toStructuredError(
        'AI_GAME_START_FAILED',
        error,
        'Unable to start AI game.',
      ),
    };
  }
}

export function handleAiMove(socketId: string, position: Position): HandleAiMoveResult {
  try {
    const currentState = aiGames.get(socketId);

    if (currentState === undefined) {
      return {
        playerState: null,
        aiState: null,
        error: {
          code: 'AI_GAME_NOT_FOUND',
          message: 'No active AI game was found for this player.',
        },
      };
    }

    const playerMoveValidation = validateMove(currentState, position, 'X');
    if (!playerMoveValidation.valid) {
      return {
        playerState: null,
        aiState: null,
        error: {
          code: playerMoveValidation.code,
          message: playerMoveValidation.message,
        },
      };
    }

    const playerState = applyMove(currentState, position, 'X');

    const playerOutcome = checkOutcome(playerState.board, playerState.moveCount);
    if (playerState.phase === 'finished' || playerOutcome !== null) {
      aiGames.delete(socketId);
      return { playerState, aiState: null, error: null };
    }

    const aiMove = getBestMove(playerState, 'O');
    const aiState = applyMove(playerState, aiMove, 'O');

    const aiOutcome = checkOutcome(aiState.board, aiState.moveCount);
    if (aiState.phase === 'finished' || aiOutcome !== null) {
      aiGames.delete(socketId);
    } else {
      aiGames.set(socketId, aiState);
    }

    return { playerState, aiState, error: null };
  } catch (error) {
    return {
      playerState: null,
      aiState: null,
      error: toStructuredError(
        'AI_MOVE_FAILED',
        error,
        'Unable to process the AI game move.',
      ),
    };
  }
}

export function cleanupAiGame(socketId: string): CleanupAiGameResult {
  try {
    aiGames.delete(socketId);
    return { error: null };
  } catch (error) {
    return {
      error: toStructuredError(
        'AI_GAME_CLEANUP_FAILED',
        error,
        'Unable to clean up AI game state.',
      ),
    };
  }
}