import type { Board, GameState, Position, Symbol } from 'shared';
import { BOARD_SIZE } from 'shared';
import { applyMove, checkOutcome, createGame, validateMove } from './game-engine.js';

const EMPTY_GAME_TEMPLATE = createGame();
const OPENING_MOVE: Position = {
  row: Math.floor(BOARD_SIZE / 2),
  col: Math.floor(BOARD_SIZE / 2),
};

function getOpponentSymbol(symbol: Symbol): Symbol {
  return symbol === 'X' ? 'O' : 'X';
}

function getAvailableMoves(state: GameState, symbol: Symbol): Position[] {
  const positions: Position[] = [];

  for (let row = 0; row < state.board.length; row += 1) {
    for (let col = 0; col < state.board.length; col += 1) {
      const position = { row, col };

      if (validateMove(state, position, symbol).valid) {
        positions.push(position);
      }
    }
  }

  return positions;
}

function isStandardEmptyBoard(board: Board): boolean {
  if (board.length !== BOARD_SIZE) {
    return false;
  }

  return board.every(
    (row, rowIndex) =>
      Array.isArray(row) &&
      row.length === BOARD_SIZE &&
      row.every((cell, colIndex) => cell === EMPTY_GAME_TEMPLATE.board[rowIndex][colIndex]),
  );
}

function scoreTerminalState(outcome: ReturnType<typeof checkOutcome>, depth: number, aiSymbol: Symbol) {
  if (outcome == null) {
    return null;
  }

  if (outcome.type === 'draw') {
    return 0;
  }

  return outcome.winner === aiSymbol ? 10 - depth : -10 + depth;
}

function minimaxWithPruning(
  state: GameState,
  depth: number,
  isMaximizing: boolean,
  aiSymbol: Symbol,
  alpha: number,
  beta: number,
): number {
  const terminalScore = scoreTerminalState(checkOutcome(state.board, state.moveCount), depth, aiSymbol);

  if (terminalScore !== null) {
    return terminalScore;
  }

  const currentSymbol = isMaximizing ? aiSymbol : getOpponentSymbol(aiSymbol);
  const moves = getAvailableMoves(state, currentSymbol);

  if (moves.length === 0) {
    return 0;
  }

  if (isMaximizing) {
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const move of moves) {
      const nextState = applyMove(state, move, currentSymbol);
      const score = minimaxWithPruning(nextState, depth + 1, false, aiSymbol, alpha, beta);
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
    const score = minimaxWithPruning(nextState, depth + 1, true, aiSymbol, alpha, beta);
    bestScore = Math.min(bestScore, score);
    beta = Math.min(beta, score);

    if (beta <= alpha) {
      break;
    }
  }

  return bestScore;
}

export function minimax(
  state: GameState,
  depth: number,
  isMaximizing: boolean,
  aiSymbol: Symbol,
): number {
  return minimaxWithPruning(
    state,
    depth,
    isMaximizing,
    aiSymbol,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  );
}

/**
 * Computes the optimal move for the AI player.
 * Uses minimax to exhaustively search the game tree.
 */
export function getBestMove(state: GameState, aiSymbol: Symbol): Position {
  if (state == null || typeof state !== 'object') {
    throw new TypeError('getBestMove: state must be a valid object.');
  }

  if (aiSymbol !== 'X' && aiSymbol !== 'O') {
    throw new TypeError(`getBestMove: aiSymbol must be 'X' or 'O', got '${String(aiSymbol)}'.`);
  }

  const currentOutcome = checkOutcome(state.board, state.moveCount);
  if (state.phase !== 'playing' || currentOutcome !== null) {
    throw new Error('getBestMove: no valid moves remain because the game is already finished.');
  }

  if (state.currentTurn !== aiSymbol) {
    throw new Error(`getBestMove: it is not ${aiSymbol}'s turn.`);
  }

  if (state.moveCount === 0 && isStandardEmptyBoard(state.board)) {
    const openingValidation = validateMove(state, OPENING_MOVE, aiSymbol);

    if (openingValidation.valid) {
      return OPENING_MOVE;
    }
  }

  const moves = getAvailableMoves(state, aiSymbol);
  if (moves.length === 0) {
    throw new Error('getBestMove: no valid moves remain for the AI.');
  }

  let bestMove = moves[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of moves) {
    const nextState = applyMove(state, move, aiSymbol);
    const score = minimax(nextState, 1, false, aiSymbol);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}