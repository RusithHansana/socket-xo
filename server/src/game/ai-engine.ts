import type { GameOutcome, GameState, Position, Symbol } from 'shared';
import { BOARD_SIZE } from 'shared';
import { applyMove, validateMove } from './game-engine.js';

const OPENING_MOVES: Position[] = [
  { row: 0, col: 0 },
  { row: 0, col: BOARD_SIZE - 1 },
  { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) },
  { row: BOARD_SIZE - 1, col: 0 },
  { row: BOARD_SIZE - 1, col: BOARD_SIZE - 1 },
];

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getOpponentSymbol(symbol: Symbol): Symbol {
  return symbol === 'X' ? 'O' : 'X';
}

function getAvailableMoves(state: GameState): Position[] {
  if (!Array.isArray(state.board)) {
    throw new TypeError('getAvailableMoves: state.board must be an array of arrays.');
  }

  const positions: Position[] = [];

  for (let row = 0; row < state.board.length; row += 1) {
    if (!Array.isArray(state.board[row])) {
      throw new TypeError(`getAvailableMoves: state.board[${row}] must be an array.`);
    }

    for (let col = 0; col < state.board[row].length; col += 1) {
      if (state.board[row][col] === null) {
        positions.push({ row, col });
      }
    }
  }

  return positions;
}

function scoreTerminalState(outcome: GameOutcome | null, depth: number, aiSymbol: Symbol) {
  if (outcome == null) {
    return null;
  }

  if (outcome.type === 'draw') {
    return 0;
  }

  return outcome.winner === aiSymbol ? 1000 - depth : -1000 + depth;
}

function minimaxWithPruning(
  state: GameState,
  depth: number,
  isMaximizing: boolean,
  aiSymbol: Symbol,
  alpha: number,
  beta: number,
  maxDepth = BOARD_SIZE * BOARD_SIZE,
): number {
  const terminalScore = scoreTerminalState(state.outcome, depth, aiSymbol);

  if (terminalScore !== null) {
    return terminalScore;
  }

  if (depth >= maxDepth) {
    return 0;
  }

  const currentSymbol = isMaximizing ? aiSymbol : getOpponentSymbol(aiSymbol);
  const moves = getAvailableMoves(state);

  if (moves.length === 0) {
    throw new Error(
      'minimaxWithPruning: reached non-terminal state with no available moves — invalid game state',
    );
  }

  if (isMaximizing) {
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const move of moves) {
      const nextState = applyMove(state, move, currentSymbol);
      const score = minimaxWithPruning(nextState, depth + 1, false, aiSymbol, alpha, beta, maxDepth);
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);

      if (beta <= alpha) {
        break;
      }
    }

    return bestScore;
  }

  let bestScore = Number.POSITIVE_INFINITY;

  for (const move of moves) {
    const nextState = applyMove(state, move, currentSymbol);
    const score = minimaxWithPruning(nextState, depth + 1, true, aiSymbol, alpha, beta, maxDepth);
    bestScore = Math.min(bestScore, score);
    beta = Math.min(beta, score);

    if (beta <= alpha) {
      break;
    }
  }

  return bestScore;
}

function minimax(
  state: GameState,
  depth: number,
  isMaximizing: boolean,
  aiSymbol: Symbol,
  maxDepth = BOARD_SIZE * BOARD_SIZE,
): number {
  return minimaxWithPruning(
    state,
    depth,
    isMaximizing,
    aiSymbol,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    maxDepth,
  );
}

/**
 * Computes the optimal move for the AI player.
 * Uses minimax to exhaustively search the game tree.
 */
export function getBestMove(state: GameState, aiSymbol: Symbol): Position {
  if (state == null || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('getBestMove: state must be a valid GameState object.');
  }

  if (aiSymbol !== 'X' && aiSymbol !== 'O') {
    throw new TypeError(`getBestMove: aiSymbol must be 'X' or 'O', got '${String(aiSymbol)}'.`);
  }

  if (state.phase !== 'playing') {
    throw new Error(
      `getBestMove: game is not in 'playing' phase (current phase: '${state.phase}').`,
    );
  }

  if (state.outcome !== null) {
    throw new Error('getBestMove: game is already finished (outcome is set).');
  }

  if (state.currentTurn !== aiSymbol) {
    throw new Error(`getBestMove: it is not ${aiSymbol}'s turn.`);
  }

  if (state.moveCount === 0) {
    const shuffledOpenings = shuffleArray(OPENING_MOVES);
    for (const opening of shuffledOpenings) {
      if (validateMove(state, opening, aiSymbol).valid) {
        return opening;
      }
    }
  }

  const moves = getAvailableMoves(state);
  if (moves.length === 0) {
    throw new Error('getBestMove: no valid moves remain for the AI.');
  }

  if (moves.length === 1) {
    return moves[0];
  }

  // Shuffle for equal-score variety; propagate alpha across siblings for pruning efficiency
  const shuffledMoves = shuffleArray(moves);
  let bestMove: Position = shuffledMoves[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  let alpha = Number.NEGATIVE_INFINITY;

  for (const move of shuffledMoves) {
    const nextState = applyMove(state, move, aiSymbol);
    const score = minimaxWithPruning(nextState, 1, false, aiSymbol, alpha, Number.POSITIVE_INFINITY);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
      alpha = Math.max(alpha, score);
    }
  }

  return bestMove;
}