import React, { useState, useCallback } from 'react';
import Dartboard from '../components/Dartboard';
import Scoreboard from '../components/Scoreboard';
import GameLog from '../components/GameLog';
import { createInitialGameState, hitNumber, hitRing, GameState } from '../game/gameLogic';
import { RING_NUMBERS, TARGET_SCORE } from '../game/boardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [p1Name, setP1Name] = useState('Player 1');
  const [p2Name, setP2Name] = useState('Player 2');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const startGame = () => {
    setGameState(createInitialGameState(p1Name || 'Player 1', p2Name || 'Player 2'));
    setLogMessages([]);
    setGameStarted(true);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameState(null);
    setLogMessages([]);
  };

  const handleHitNumber = useCallback((num: number) => {
    if (!gameState || gameState.gameOver) return;
    const result = hitNumber(gameState, num);
    setGameState(result.state);
    setLogMessages(prev => [...prev, `[${result.state.players[gameState.currentPlayer].name}] ${result.message}`]);
  }, [gameState]);

  const handleHitRing = useCallback((ringIndex: number) => {
    if (!gameState || gameState.gameOver) return;
    const nums = RING_NUMBERS[ringIndex];
    if (!nums || nums.length === 0) return;
    const result = hitRing(gameState, ringIndex, nums);
    setGameState(result.state);
    const playerName = gameState.players[gameState.currentPlayer].name;
    setLogMessages(prev => [...prev, `[${playerName}] ${result.state.lastAction}`, ...result.messages.map(m => `  → ${m}`)]);
  }, [gameState]);

  if (!gameStarted || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <h1 className="text-6xl text-foreground tracking-wider">FILLING GAME</h1>
            <p className="text-muted-foreground mt-2 text-sm font-mono-game">Strategic Dart Competition</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-widest font-mono-game">Player 1</label>
                <Input value={p1Name} onChange={(e) => setP1Name(e.target.value)} className="mt-1 bg-muted border-border text-foreground" placeholder="Player 1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-widest font-mono-game">Player 2</label>
                <Input value={p2Name} onChange={(e) => setP2Name(e.target.value)} className="mt-1 bg-muted border-border text-foreground" placeholder="Player 2" />
              </div>
            </div>
            <Button onClick={startGame} className="w-full text-lg h-12" size="lg">🎯 Start Game</Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 font-mono-game">
            <p>Target: {TARGET_SCORE} pts per batch</p>
            <p>3 darts per turn • Numbers 1–14</p>
            <p>Click numbers or rings to throw</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl text-foreground tracking-wider">FILLING GAME</h1>
        <Button variant="outline" size="sm" onClick={resetGame}>New Game</Button>
      </div>

      {/* Game Over */}
      {gameState.gameOver && gameState.winner !== null && (
        <div className="max-w-6xl mx-auto mb-4 bg-primary/20 border border-primary rounded-xl p-6 text-center glow-green">
          <h2 className="text-4xl text-primary text-shadow-glow">
            {gameState.players[gameState.winner].name} WINS!
          </h2>
          <p className="text-muted-foreground font-mono-game mt-2">
            Final Score: {gameState.players[gameState.winner].totalScore} pts
          </p>
          <Button onClick={resetGame} className="mt-4">Play Again</Button>
        </div>
      )}

      {/* Main layout: scoreboard left, dartboard+dart center */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-4">
        {/* Dartboard + Dart Arrow - center stage */}
        <div className="flex-1 flex flex-col items-center order-1 lg:order-2">
          {/* Turn indicator */}
          <div className="text-center mb-2">
            <span className="font-mono-game text-sm text-primary animate-pulse-glow">
              {gameState.players[gameState.currentPlayer].name}'s turn
            </span>
            <span className="text-muted-foreground text-xs ml-2 font-mono-game">
              ({gameState.dartsRemaining} darts left)
            </span>
          </div>

          <Dartboard
            gameState={gameState}
            onHitNumber={handleHitNumber}
            onHitRing={handleHitRing}
            disabled={gameState.gameOver}
          />
        </div>

        {/* Scoreboard + Log - side panel */}
        <div className="w-full lg:w-72 space-y-3 order-2 lg:order-1">
          <Scoreboard
            players={gameState.players}
            currentPlayer={gameState.currentPlayer}
            dartsRemaining={gameState.dartsRemaining}
            batch={gameState.batch}
            batch1Score={gameState.batch1Score}
            closedNumbers={gameState.closedNumbers}
          />

          <GameLog messages={logMessages} />

          {/* Ring legend */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-mono-game">Ring Guide</h4>
            <div className="space-y-1 text-xs font-mono-game">
              <p><span className="text-foreground">Ring 1:</span> <span className="text-muted-foreground">7, 4, 3, 6, 2</span></p>
              <p><span className="text-foreground">Ring 2:</span> <span className="text-muted-foreground">11, 5, 9, 8, 10, 1</span></p>
              <p><span className="text-foreground">Ring 3:</span> <span className="text-muted-foreground">14, 12, 13</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
