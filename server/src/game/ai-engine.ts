import type { GameState, Position, Symbol } from 'shared';
import { BOARD_SIZE } from 'shared';
import { applyMove, checkOutcome, validateMove } from './game-engine.js';

// Center cell: use integer division — for even BOARD_SIZE there is no true center,
// so we pick the upper-left quadrant cell closest to center (row/col both floor).
const CENTER_ROW = Math.floor((BOARD_SIZE - 1) / 2);
const CENTER_COL = Math.floor((BOARD_SIZE - 1) / 2);

const OPENING_MOVES: Position[] = [
  { row: 0, col: 0 },
  { row: 0, col: BOARD_SIZE - 1 },
  { row: CENTER_ROW, col: CENTER_COL },
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
  if (symbol !== 'X' && symbol !== 'O') {
    throw new TypeError(`getOpponentSymbol: symbol must be 'X' or 'O', got '${String(symbol)}'.`);
  }
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

function scoreTerminalState(
  state: GameState,
  depth: number,
  aiSymbol: Symbol,
): number | null {
  // Use state.outcome for fast terminal detection in the hot minimax loop.
  // state.outcome is set by applyMove after every move — no re-computation needed.
  // checkOutcome is called once in getBestMove for AC #4 compliance.
  const outcome = state.outcome;

  if (outcome == null) {
    return null;
  }

  if (outcome.type === 'draw') {
    return 0;
  }

  return outcome.winner === aiSymbol ? 1000 - depth : -1000 + depth;
}

// Maximum search depth: cap at board size squared (total cells) to prevent stack overflow
// on boards larger than 3×3. Callers may pass a smaller value to enforce tighter limits.
const MAX_MINIMAX_DEPTH = BOARD_SIZE * BOARD_SIZE;

function minimaxWithPruning(
  state: GameState,
  depth: number,
  isMaximizing: boolean,
  aiSymbol: Symbol,
  alpha: number,
  beta: number,
  maxDepth: number = MAX_MINIMAX_DEPTH,
): number {
  const terminalScore = scoreTerminalState(state, depth, aiSymbol);

  if (terminalScore !== null) {
    return terminalScore;
  }

  if (depth >= maxDepth) {
    // Return neutral score at depth limit. Piece-counting is not a reliable positional
    // heuristic for Tic-Tac-Toe. For standard 3×3 play this branch is unreachable (every
    // game reaches a terminal state within maxDepth moves), but it guards against stack
    // overflow if getBestMove is ever called on a larger board.
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

/**
 * Computes the optimal move for the AI player.
 * Uses minimax to exhaustively search the game tree.
 */
export function getBestMove(state: GameState, aiSymbol: Symbol): Position {
  if (state == null || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('getBestMove: state must be a valid GameState object.');
  }

  // Explicit property existence guards before usage
  if (typeof state.phase !== 'string') {
    throw new TypeError('getBestMove: state.phase must be a string.');
  }

  if (!('outcome' in state)) {
    throw new TypeError('getBestMove: state.outcome property is missing.');
  }

  if (state.currentTurn !== 'X' && state.currentTurn !== 'O') {
    throw new TypeError(
      `getBestMove: state.currentTurn must be 'X' or 'O', got '${String(state.currentTurn)}'.`,
    );
  }

  if (typeof state.moveCount !== 'number' || !Number.isInteger(state.moveCount) || state.moveCount < 0) {
    throw new TypeError('getBestMove: state.moveCount must be a non-negative integer.');
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

  // Use checkOutcome from game-engine to confirm the position is non-terminal (AC #4 compliance).
  // Also guards against states where outcome is null but the board is actually terminal.
  const confirmedOutcome = checkOutcome(state.board, state.moveCount);
  if (confirmedOutcome !== null) {
    throw new Error('getBestMove: game-engine confirms the position is already terminal.');
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
    const singleValidation = validateMove(state, moves[0], aiSymbol);
    if (!singleValidation.valid) {
      throw new Error(`getBestMove: only available move is invalid — ${singleValidation.message}`);
    }
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

  const finalValidation = validateMove(state, bestMove, aiSymbol);
  if (!finalValidation.valid) {
    throw new Error(`getBestMove: computed best move is invalid — ${finalValidation.message}`);
  }
  return bestMove;
}