import React, { useState, useCallback, useEffect, useRef } from 'react';
import GoBoard from './components/Board';
import { GameState, BOARD_SIZE, PlayerColor, KOMI } from './types';
import { tryMakeMove } from './utils/gameLogic';
import { getAiMove } from './services/geminiService';
import { PlayIcon, RotateCcwIcon, FlagIcon, CpuIcon, UserIcon } from 'lucide-react';

const INITIAL_BOARD = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

const INITIAL_STATE: GameState = {
  board: INITIAL_BOARD,
  currentPlayer: 'black',
  captured: { black: 0, white: 0 },
  history: [JSON.stringify(INITIAL_BOARD)],
  lastMove: null,
  passes: 0,
  gameOver: false,
  winner: null,
};

function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiColor, setAiColor] = useState<PlayerColor>('white');
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // Game Log scroll ref
  const logEndRef = useRef<HTMLDivElement>(null);
  const [gameLog, setGameLog] = useState<string[]>(["Game Started. Black to play."]);

  const addLog = (msg: string) => {
    setGameLog(prev => [...prev, msg]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameLog]);

  // AI Turn Effect
  useEffect(() => {
    if (aiEnabled && !gameState.gameOver && gameState.currentPlayer === aiColor) {
      const makeAiMove = async () => {
        setIsAiThinking(true);
        addLog(`AI (${aiColor}) is thinking...`);
        
        try {
            const move = await getAiMove(gameState.board, aiColor, gameState.lastMove);
            setIsAiThinking(false);
            
            if (move === 'resign') {
                handleResign();
            } else if (move === 'pass') {
                handlePass();
            } else {
                handleMove(move.x, move.y);
            }
        } catch (e) {
            console.error(e);
            setIsAiThinking(false);
            addLog("AI failed to move. Passing turn.");
            handlePass();
        }
      };
      
      makeAiMove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayer, gameState.gameOver, aiEnabled, aiColor]);


  const handleMove = useCallback((x: number, y: number) => {
    if (gameState.gameOver) return;
    setErrorMsg(null);

    const result = tryMakeMove(
      gameState.board,
      x,
      y,
      gameState.currentPlayer,
      gameState.history
    );

    if (result.success && result.newBoard) {
      const nextPlayer = gameState.currentPlayer === 'black' ? 'white' : 'black';
      
      // Update Captures
      // If current player is Black, they captured White stones (add to captured.black)
      const newCaptured = { ...gameState.captured };
      if (gameState.currentPlayer === 'black') {
        newCaptured.black += result.capturedCount || 0;
      } else {
        newCaptured.white += result.capturedCount || 0;
      }

      // Add to log
      const coordLabel = `${String.fromCharCode(65 + (x >= 8 ? x + 1 : x))}${BOARD_SIZE - y}`; // Conventional Go coords (skip 'I')
      let logMsg = `${gameState.currentPlayer === 'black' ? 'Black' : 'White'} plays ${coordLabel}`;
      if (result.capturedCount && result.capturedCount > 0) {
        logMsg += ` and captures ${result.capturedCount}`;
      }
      addLog(logMsg);

      setGameState(prev => ({
        ...prev,
        board: result.newBoard!,
        currentPlayer: nextPlayer,
        captured: newCaptured,
        history: [...prev.history, JSON.stringify(result.newBoard!)],
        lastMove: { x, y },
        passes: 0, // Reset passes on valid move
      }));
    } else {
      setErrorMsg(result.error || "Invalid move");
      setTimeout(() => setErrorMsg(null), 2000);
    }
  }, [gameState]);

  const handlePass = useCallback(() => {
    if (gameState.gameOver) return;
    addLog(`${gameState.currentPlayer === 'black' ? 'Black' : 'White'} passes.`);
    
    const nextPlayer = gameState.currentPlayer === 'black' ? 'white' : 'black';
    const newPasses = gameState.passes + 1;

    setGameState(prev => ({
      ...prev,
      currentPlayer: nextPlayer,
      passes: newPasses,
      // If 2 consecutive passes (one by each), game over
      gameOver: newPasses >= 2,
    }));

    if (newPasses >= 2) {
      calculateScore();
    }
  }, [gameState]);

  const handleResign = useCallback(() => {
    const winner = gameState.currentPlayer === 'black' ? 'white' : 'black';
    setGameState(prev => ({
      ...prev,
      gameOver: true,
      winner: winner
    }));
    addLog(`${gameState.currentPlayer} resigns. ${winner} wins!`);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState(INITIAL_STATE);
    setGameLog(["Game Started. Black to play."]);
    setErrorMsg(null);
  }, []);

  const calculateScore = () => {
    // Basic scoring: Territory (empty points surrounded) + Captured stones + Komi
    // This is a simplified "Area Scoring" approximation for this demo because full territory logic is complex.
    // We will just count stones on board + prisoners + komi.
    // Real implementation usually requires dead stone selection phase.
    
    // For this simple version, we'll declare game over and let users judge, or basic stone count.
    addLog("Game Over. Please calculate score manually (Auto-score is complex in Go!).");
    setGameState(prev => ({ ...prev, gameOver: true, winner: 'draw' })); // Placeholder
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-stone-900 text-stone-200 font-sans selection:bg-amber-700 selection:text-white">
      
      {/* Sidebar / Controls */}
      <div className="w-full lg:w-80 flex flex-col p-6 bg-stone-800 border-r border-stone-700 shadow-2xl z-10">
        <h1 className="text-3xl font-light tracking-widest text-amber-500 mb-8 border-b border-stone-600 pb-4">
          ZEN GO
        </h1>

        {/* Player Status */}
        <div className="space-y-6 mb-8">
            {/* Black Player */}
            <div className={`p-4 rounded-lg flex items-center justify-between transition-all ${gameState.currentPlayer === 'black' ? 'bg-stone-700 ring-1 ring-amber-500/50' : 'bg-stone-800/50'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-black ring-2 ring-stone-600"></div>
                    <div>
                        <span className="block font-bold">Black</span>
                        <span className="text-xs text-stone-400">Captured: {gameState.captured.black}</span>
                    </div>
                </div>
                {gameState.currentPlayer === 'black' && !gameState.gameOver && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
            </div>

            {/* White Player */}
            <div className={`p-4 rounded-lg flex items-center justify-between transition-all ${gameState.currentPlayer === 'white' ? 'bg-stone-700 ring-1 ring-amber-500/50' : 'bg-stone-800/50'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-white ring-2 ring-stone-600"></div>
                    <div>
                        <span className="block font-bold text-white">White</span>
                        <span className="text-xs text-stone-400">Captured: {gameState.captured.white} + {KOMI} (Komi)</span>
                    </div>
                </div>
                {gameState.currentPlayer === 'white' && !gameState.gameOver && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
            </div>
        </div>

        {/* AI Toggle */}
        <div className="mb-6 p-4 bg-stone-900/50 rounded-lg border border-stone-700">
            <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-stone-300">
                    <CpuIcon size={16} /> Play vs AI (Gemini)
                </span>
                <button 
                    onClick={() => setAiEnabled(!aiEnabled)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${aiEnabled ? 'bg-amber-600' : 'bg-stone-600'}`}
                >
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${aiEnabled ? 'translate-x-5' : ''}`}></div>
                </button>
            </div>
            {aiEnabled && (
                <div className="flex gap-2 text-xs">
                    <button 
                        onClick={() => setAiColor('white')}
                        className={`px-3 py-1 rounded border ${aiColor === 'white' ? 'bg-stone-700 border-amber-500 text-amber-500' : 'border-stone-600 text-stone-400'}`}
                    >
                        AI plays White
                    </button>
                    <button 
                        onClick={() => setAiColor('black')}
                        className={`px-3 py-1 rounded border ${aiColor === 'black' ? 'bg-stone-700 border-amber-500 text-amber-500' : 'border-stone-600 text-stone-400'}`}
                    >
                        AI plays Black
                    </button>
                </div>
            )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-auto">
            <button 
                onClick={handlePass}
                disabled={gameState.gameOver || isAiThinking}
                className="flex items-center justify-center gap-2 py-3 bg-stone-700 hover:bg-stone-600 rounded-md font-semibold transition-colors disabled:opacity-50"
            >
                <PlayIcon size={16} /> Pass
            </button>
            <button 
                onClick={handleResign}
                disabled={gameState.gameOver || isAiThinking}
                className="flex items-center justify-center gap-2 py-3 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-md font-semibold transition-colors disabled:opacity-50"
            >
                <FlagIcon size={16} /> Resign
            </button>
        </div>
        
        <button 
            onClick={resetGame}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 border border-stone-600 hover:bg-stone-800 rounded-md text-stone-400 hover:text-white transition-colors"
        >
            <RotateCcwIcon size={16} /> New Game
        </button>

      </div>

      {/* Main Board Area */}
      <div className="flex-1 relative bg-stone-900 flex flex-col items-center justify-center p-4 lg:p-10 overflow-auto">
        
        {/* Error Toast */}
        {errorMsg && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-full shadow-lg z-50 animate-bounce">
                {errorMsg}
            </div>
        )}

        {/* Game Over Overlay */}
        {gameState.gameOver && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-stone-800 p-8 rounded-xl border border-stone-600 shadow-2xl text-center max-w-md">
                    <h2 className="text-4xl font-light text-amber-500 mb-2">Game Over</h2>
                    <p className="text-stone-300 mb-6">
                        {gameState.winner === 'draw' 
                            ? "The game has ended via pass. Calculate scores." 
                            : <span className="capitalize text-xl">{gameState.winner} won by resignation!</span>}
                    </p>
                    <button onClick={resetGame} className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded-lg font-bold transition-transform hover:scale-105">
                        Play Again
                    </button>
                </div>
            </div>
        )}

        {/* The Board */}
        <div className="relative group">
             <GoBoard 
                board={gameState.board} 
                onIntersectionClick={handleMove}
                lastMove={gameState.lastMove}
                currentPlayer={gameState.currentPlayer}
                isAiThinking={isAiThinking}
             />
        </div>

        {/* Game Log (Mobile Friendly) */}
        <div className="w-full max-w-2xl mt-8 h-32 bg-stone-800 rounded-lg p-4 overflow-y-auto scrollbar-hide border border-stone-700/50">
             <div className="text-xs text-stone-500 uppercase tracking-wider mb-2 sticky top-0 bg-stone-800 pb-2 border-b border-stone-700">Game Log</div>
             <div className="space-y-1">
                {gameLog.map((log, i) => (
                    <div key={i} className="text-sm text-stone-400 font-mono">
                        <span className="text-stone-600 mr-2">{i+1}.</span>{log}
                    </div>
                ))}
                <div ref={logEndRef} />
             </div>
        </div>

      </div>
    </div>
  );
}

export default App;