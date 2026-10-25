/**
 * Wire contract - mirrors Checkers/Contracts exactly (pseudocode section 1).
 *
 * The backend runs JsonStringEnumConverter, so enums arrive as STRINGS
 * ("White", "Ongoing", "Capture"). camelCase property names.
 * This file is the ONLY place these shapes are declared.
 */

export type PieceColor = "White" | "Black";
export type GameStatus = "Ongoing" | "WhiteWon" | "BlackWon" | "Draw";
export type MoveType = "Quiet" | "Capture";
export type PieceType = "Man" | "King";

export interface Position {
  row: number;
  col: number;
}

export interface Player {
  id: number;
  name: string;
  color: PieceColor;
}

export interface Square {
  number: string | null;
  position: Position;
  isDark: boolean;
  occupantId: number | null;
  occupantColor: PieceColor | null;
  occupantType: PieceType | null;
}

export interface Move {
  from: Position;
  to: Position;
  path: Position[];
  capturedPieceIds: number[];
  type: MoveType;
  color: PieceColor;
  notation: string;
}

export interface GameState {
  gameId: string;
  turn: number;
  turnColor: PieceColor;
  status: GameStatus;
  winnerId: number | null;
  players: Player[];
  squares: Square[];
  history: Move[];
}

export interface LegalMoves {
  moves: Move[];
}

export interface ActionResult {
  success: boolean;
  message: string | null;
  status: GameStatus;
}

export interface ErrorBody {
  message: string;
}


export interface CreateGame {
  whitePlayerName?: string;
  blackPlayerName?: string;
}

export interface MoveCmd {
  playerId: number;
  from: Position;
  to: Position;
  path?: Position[] | null;
}

export interface PlayerCmd {
  playerId: number;
}
