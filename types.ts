export type PlayerColor = 'black' | 'white';
export type BoardState = (PlayerColor | null)[][];

export interface GameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  captured: {
    black: number; // captured BY black (white stones removed)
    white: number; // captured BY white (black stones removed)
  };
  history: string[]; // For Ko rule checking
  lastMove: { x: number; y: number } | null;
  passes: number;
  gameOver: boolean;
  winner: PlayerColor | 'draw' | null;
}

export interface MoveResult {
  success: boolean;
  newBoard?: BoardState;
  capturedCount?: number;
  error?: string;
}

export const BOARD_SIZE = 19;
export const KOMI = 6.5;