import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { Board, GameOutcome, GamePhase, GameState, PlayerInfo, Symbol } from 'shared';

export interface MoveError {
  code: string;
  message: string;
}

export interface GameContextState {
  roomId: string | null;
  board: Board;
  currentTurn: Symbol;
  players: PlayerInfo[];
  phase: GamePhase;
  outcome: GameOutcome | null;
  moveCount: number;
  lastMoveError: MoveError | null;
}

export type GameAction =
  | { type: 'GAME_START'; payload: GameState }
  | { type: 'GAME_STATE_UPDATE'; payload: GameState }
  | { type: 'GAME_OVER'; payload: GameState }
  | { type: 'MOVE_REJECTED'; payload: MoveError }
  | { type: 'RESET' };

export interface GameContextValue {
  state: GameContextState;
  dispatch: Dispatch<GameAction>;
}

function mapGameStateToContextState(state: GameState): GameContextState {
  return {
    roomId: state.roomId,
    board: state.board,
    currentTurn: state.currentTurn,
    players: state.players,
    phase: state.phase,
    outcome: state.outcome,
    moveCount: state.moveCount,
    lastMoveError: null,
  };
}

export function getInitialGameState(): GameContextState {
  return {
    roomId: null,
    board: [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ],
    currentTurn: 'X',
    players: [],
    phase: 'waiting',
    outcome: null,
    moveCount: 0,
    lastMoveError: null,
  };
}

export function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'GAME_START':
    case 'GAME_STATE_UPDATE':
    case 'GAME_OVER':
      return mapGameStateToContextState(action.payload);

    case 'MOVE_REJECTED':
      return {
        ...state,
        lastMoveError: action.payload,
      };

    case 'RESET':
      return getInitialGameState();

    default:
      return state;
  }
}

export const GameContext = createContext<GameContextValue | undefined>(undefined);
GameContext.displayName = 'GameContext';
