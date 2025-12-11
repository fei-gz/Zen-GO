import { BoardState, PlayerColor, MoveResult, BOARD_SIZE } from "../types";

// Helper to deep copy board
const copyBoard = (board: BoardState): BoardState => board.map(row => [...row]);

// Check if coordinates are on board
const isOnBoard = (x: number, y: number) => x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;

// Get neighbors [x, y]
const getNeighbors = (x: number, y: number) => {
  const neighbors = [];
  if (x > 0) neighbors.push({ x: x - 1, y });
  if (x < BOARD_SIZE - 1) neighbors.push({ x: x + 1, y });
  if (y > 0) neighbors.push({ x, y: y - 1 });
  if (y < BOARD_SIZE - 1) neighbors.push({ x, y: y + 1 });
  return neighbors;
};

// Calculate liberties for a group of stones
// Returns the group (array of coords) and total liberties (count of unique empty neighbors)
const getGroupAndLiberties = (board: BoardState, x: number, y: number) => {
  const color = board[y][x];
  if (!color) return { group: [], liberties: 0 };

  const group: { x: number; y: number }[] = [];
  const visited = new Set<string>();
  const queue = [{ x, y }];
  visited.add(`${x},${y}`);

  const liberties = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    group.push(current);

    const neighbors = getNeighbors(current.x, current.y);
    for (const n of neighbors) {
      const neighborColor = board[n.y][n.x];
      const key = `${n.x},${n.y}`;

      if (neighborColor === null) {
        liberties.add(key);
      } else if (neighborColor === color && !visited.has(key)) {
        visited.add(key);
        queue.push(n);
      }
    }
  }

  return { group, liberties: liberties.size };
};

export const tryMakeMove = (
  currentBoard: BoardState,
  x: number,
  y: number,
  player: PlayerColor,
  history: string[]
): MoveResult => {
  // 1. Basic validation
  if (!isOnBoard(x, y)) return { success: false, error: "Invalid position" };
  if (currentBoard[y][x] !== null) return { success: false, error: "Position occupied" };

  const newBoard = copyBoard(currentBoard);
  newBoard[y][x] = player;

  // 2. Capture enemy stones
  const neighbors = getNeighbors(x, y);
  let capturedCount = 0;
  const opponent = player === 'black' ? 'white' : 'black';

  neighbors.forEach(n => {
    if (newBoard[n.y][n.x] === opponent) {
      const { group, liberties } = getGroupAndLiberties(newBoard, n.x, n.y);
      if (liberties === 0) {
        // Remove captured stones
        group.forEach(stone => {
          newBoard[stone.y][stone.x] = null;
          capturedCount++;
        });
      }
    }
  });

  // 3. Check for Suicide (forbidden unless it captures)
  const { liberties: selfLiberties } = getGroupAndLiberties(newBoard, x, y);
  if (selfLiberties === 0) {
    return { success: false, error: "Suicide move is forbidden" };
  }

  // 4. Ko Rule (cannot repeat board state)
  const boardHash = JSON.stringify(newBoard);
  // Check specifically against the state directly before the current player's turn? 
  // Standard Ko: cannot repeat the *immediately previous* board state of the same player? 
  // Simplest global Ko: cannot repeat *any* previous state is Superko. 
  // Let's implement simple Ko: cannot check against immediate history[-1] (which is start of this turn)
  // Actually, we check if new state exists in history.
  // Standard simple Ko checks only immediate repetition.
  // To avoid complex Superko logic for this app, we just check if it matches the board from 1 full turn ago (2 moves back).
  if (history.length > 1 && history[history.length - 2] === boardHash) {
     return { success: false, error: "Ko rule: cannot repeat position immediately" };
  }

  return { success: true, newBoard, capturedCount };
};