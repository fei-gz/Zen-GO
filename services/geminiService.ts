import { GoogleGenAI } from "@google/genai";
import { BoardState, PlayerColor } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAiMove = async (
  board: BoardState,
  player: PlayerColor,
  lastMove: { x: number, y: number } | null
): Promise<{ x: number; y: number } | 'pass' | 'resign'> => {
  
  // Convert board to a simplified string representation to save tokens
  // . = empty, B = black, W = white
  const boardStr = board.map(row => 
    row.map(cell => {
      if (cell === 'black') return 'B';
      if (cell === 'white') return 'W';
      return '.';
    }).join('')
  ).join('\n');

  const colorStr = player === 'black' ? 'Black' : 'White';
  const lastMoveStr = lastMove ? `(${lastMove.x}, ${lastMove.y})` : 'None';

  const prompt = `
    You are an expert Go (Weiqi) player.
    The board size is 19x19.
    You are playing as ${colorStr}.
    
    Current Board State:
    ${boardStr}

    The last move was at: ${lastMoveStr}.

    Your goal is to choose the best next move to win territory and capture stones.
    
    Rules:
    1. Do not place a stone on an occupied spot (marked B or W).
    2. Do not commit suicide (placing a stone where it has no liberties and captures nothing).
    3. Return ONLY a JSON object with the coordinates.
    4. Coordinates are 0-indexed: x (column, 0-18), y (row, 0-18).
    5. If you want to pass, return { "action": "pass" }.
    6. If you want to resign, return { "action": "resign" }.
    7. Otherwise return { "x": number, "y": number }.

    Output format example: { "x": 3, "y": 16 }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text);

    if (result.action === 'pass') return 'pass';
    if (result.action === 'resign') return 'resign';
    
    // Validate coordinates
    if (typeof result.x === 'number' && typeof result.y === 'number') {
       return { x: result.x, y: result.y };
    }

    // Fallback if AI hallucinates bad format
    return 'pass';

  } catch (error) {
    console.error("AI Move Error:", error);
    // Fallback to pass on error to prevent crash
    return 'pass';
  }
};