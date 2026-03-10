import { describe, expect, it } from 'vitest';
import { cleanupAiGame, handleAiMove, isAiGame, startAiGame } from './ai-game-handler.js';

function countSymbol(stateBoard: (('X' | 'O' | null)[])[], symbol: 'X' | 'O') {
  return stateBoard.flat().filter((cell) => cell === symbol).length;
}

describe('ai-game-handler', () => {
  it('7.2 — startAiGame creates a valid GameState with player as X and AI as O', () => {
    const result = startAiGame('socket-1', 'player-1', 'Player One', 'https://robohash.org/player-1');

    expect(result.error).toBeNull();
    expect(result.state).not.toBeNull();
    expect(result.state?.roomId).toBe('ai-socket-1');
    expect(result.state?.currentTurn).toBe('X');
    expect(result.state?.players).toEqual([
      {
        playerId: 'player-1',
        displayName: 'Player One',
        avatarUrl: 'https://robohash.org/player-1',
        symbol: 'X',
        connected: true,
      },
      {
        playerId: 'ai',
        displayName: 'AI Opponent',
        avatarUrl: 'https://robohash.org/ai',
        symbol: 'O',
        connected: true,
      },
    ]);

    cleanupAiGame('socket-1');
  });

  it('7.3 — handleAiMove validates, applies the player move, computes the AI move, and returns updated state', () => {
    startAiGame('socket-2', 'player-2', 'Player Two', 'https://robohash.org/player-2');

    const result = handleAiMove('socket-2', { row: 0, col: 0 });

    expect(result.error).toBeNull();
    expect(result.playerState?.board[0][0]).toBe('X');
    expect(result.aiState).not.toBeNull();
    expect(countSymbol(result.aiState?.board ?? [], 'X')).toBe(1);
    expect(countSymbol(result.aiState?.board ?? [], 'O')).toBe(1);
    expect(result.aiState?.moveCount).toBe(2);
    expect(result.aiState?.currentTurn).toBe('X');

    cleanupAiGame('socket-2');
  });

  it('7.4 — handleAiMove rejects invalid moves with correct error codes', () => {
    startAiGame('socket-3', 'player-3', 'Player Three', 'https://robohash.org/player-3');
    handleAiMove('socket-3', { row: 0, col: 0 });

    const result = handleAiMove('socket-3', { row: 0, col: 0 });

    expect(result.playerState).toBeNull();
    expect(result.aiState).toBeNull();
    expect(result.error).toEqual({
      code: 'CELL_OCCUPIED',
      message: 'Cell (0, 0) is already occupied.',
    });

    cleanupAiGame('socket-3');
  });

  it('7.5 — handleAiMove detects game-over outcomes', () => {
    startAiGame('socket-4', 'player-4', 'Player Four', 'https://robohash.org/player-4');

    const candidateMoves = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ];

    let finalState = null;

    for (const move of candidateMoves) {
      const result = handleAiMove('socket-4', move);
      if (result.error !== null) {
        continue;
      }

      finalState = result.aiState ?? result.playerState;
      if (finalState?.outcome !== null) {
        break;
      }
    }

    expect(finalState).not.toBeNull();
    expect(finalState?.phase).toBe('finished');
    expect(finalState?.outcome).not.toBeNull();
    expect(isAiGame('socket-4')).toBe(false);
  });

  it('7.6 — cleanupAiGame removes state from the map', () => {
    startAiGame('socket-5', 'player-5', 'Player Five', 'https://robohash.org/player-5');

    expect(isAiGame('socket-5')).toBe(true);

    const result = cleanupAiGame('socket-5');

    expect(result.error).toBeNull();
    expect(isAiGame('socket-5')).toBe(false);
  });
});