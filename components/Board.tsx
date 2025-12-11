import React, { useMemo } from 'react';
import { BoardState, BOARD_SIZE, PlayerColor } from '../types';

interface BoardProps {
  board: BoardState;
  onIntersectionClick: (x: number, y: number) => void;
  lastMove: { x: number; y: number } | null;
  currentPlayer: PlayerColor;
  isAiThinking: boolean;
}

// Star points for 19x19
const STAR_POINTS = [
  { x: 3, y: 3 }, { x: 9, y: 3 }, { x: 15, y: 3 },
  { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 },
  { x: 3, y: 15 }, { x: 9, y: 15 }, { x: 15, y: 15 },
];

const GoBoard: React.FC<BoardProps> = ({ board, onIntersectionClick, lastMove, currentPlayer, isAiThinking }) => {
  const cellSize = 30;
  const padding = 30;
  const boardPixelSize = (BOARD_SIZE - 1) * cellSize + padding * 2;

  // Render grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      // Vertical
      lines.push(
        <line
          key={`v-${i}`}
          x1={padding + i * cellSize}
          y1={padding}
          x2={padding + i * cellSize}
          y2={boardPixelSize - padding}
          stroke="#000"
          strokeWidth="1"
        />
      );
      // Horizontal
      lines.push(
        <line
          key={`h-${i}`}
          x1={padding}
          y1={padding + i * cellSize}
          x2={boardPixelSize - padding}
          y2={padding + i * cellSize}
          stroke="#000"
          strokeWidth="1"
        />
      );
    }
    return lines;
  }, [boardPixelSize]);

  // Render stones
  const stones = [];
  const hoverGuides = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const stone = board[y][x];
      const cx = padding + x * cellSize;
      const cy = padding + y * cellSize;

      if (stone) {
        stones.push(
          <g key={`stone-${x}-${y}`}>
            {/* Shadow */}
            <circle cx={cx + 1} cy={cy + 1} r={cellSize / 2 - 1} fill="rgba(0,0,0,0.3)" />
            {/* Stone Body */}
            <circle
              cx={cx}
              cy={cy}
              r={cellSize / 2 - 1}
              className={stone === 'black' ? 'fill-black' : 'fill-white'}
              stroke={stone === 'white' ? '#ddd' : 'none'}
              strokeWidth={0.5}
            />
            {/* Specular highlight for pseudo-3D effect */}
            <circle
              cx={cx - 3}
              cy={cy - 3}
              r={cellSize / 6}
              fill="rgba(255,255,255,0.2)"
              className="pointer-events-none"
            />
            {/* Last move marker */}
            {lastMove && lastMove.x === x && lastMove.y === y && (
              <circle
                cx={cx}
                cy={cy}
                r={cellSize / 6}
                fill={stone === 'black' ? 'white' : 'black'}
                opacity={0.7}
              />
            )}
          </g>
        );
      } else {
        // Interactive area for empty intersection
        hoverGuides.push(
          <rect
            key={`click-${x}-${y}`}
            x={cx - cellSize / 2}
            y={cy - cellSize / 2}
            width={cellSize}
            height={cellSize}
            fill="transparent"
            className={`cursor-pointer hover:bg-black/10 transition-colors ${isAiThinking ? 'cursor-wait' : ''}`}
            onClick={() => !isAiThinking && onIntersectionClick(x, y)}
          />
        );
      }
    }
  }

  return (
    <div className="relative shadow-2xl rounded-sm overflow-hidden bg-[#e2b76e]">
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply" 
        style={{
            backgroundImage: `url("https://www.transparenttextures.com/patterns/wood-pattern.png")` 
        }}
      />
      <svg
        width={boardPixelSize}
        height={boardPixelSize}
        viewBox={`0 0 ${boardPixelSize} ${boardPixelSize}`}
        className="block"
      >
        {/* Grid */}
        {gridLines}

        {/* Star Points */}
        {STAR_POINTS.map((p, i) => (
          <circle
            key={`star-${i}`}
            cx={padding + p.x * cellSize}
            cy={padding + p.y * cellSize}
            r={3}
            fill="#000"
          />
        ))}

        {/* Stones */}
        {stones}
        
        {/* Click handlers overlay */}
        {hoverGuides}
      </svg>
    </div>
  );
};

export default GoBoard;