import React, { useState, useCallback } from 'react';
import Dartboard from '../components/Dartboard';
import GameLog from '../components/GameLog';
import { createInitialGameState, hitNumber, hitRing, GameState, PlayerState } from '../game/gameLogic';
import { RING_NUMBERS, TARGET_SCORE, TOTAL_NUMBERS } from '../game/boardLayout';
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
            <p>① Click dart arrow → board spins 5-7s</p>
            <p>② Click dart arrow again → stops & throws!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl text-foreground tracking-wider">FILLING GAME</h1>
        <div className="flex items-center gap-3">
          <span className="font-mono-game text-sm text-primary animate-pulse-glow hidden sm:inline">
            {gameState.players[gameState.currentPlayer].name}'s turn
          </span>
          <span className="text-muted-foreground text-xs font-mono-game hidden sm:inline">
            ({gameState.dartsRemaining} darts)
          </span>
          <Button variant="outline" size="sm" onClick={resetGame}>New Game</Button>
        </div>
      </div>

      {/* Game Over Banner */}
      {gameState.gameOver && gameState.winner !== null && (
        <div className="max-w-7xl mx-auto mb-4 bg-primary/20 border border-primary rounded-xl p-6 text-center glow-green">
          <h2 className="text-4xl text-primary text-shadow-glow">
            {gameState.players[gameState.winner].name} WINS!
          </h2>
          <p className="text-muted-foreground font-mono-game mt-2">
            Final Score: {gameState.players[gameState.winner].totalScore} pts
          </p>
          <Button onClick={resetGame} className="mt-4">Play Again</Button>
        </div>
      )}

      {/* 
        Main 3-column layout:
        LEFT  → Player 1 scoreboard
        CENTER → Dart arrow + Dartboard + (GameLog + Hint below)
        RIGHT  → Player 2 scoreboard
      */}
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-4 items-start justify-center">

        {/* ===== LEFT: Player 1 ===== */}
        <div className="xl:w-64 w-full xl:flex-shrink-0 order-2 xl:order-1 space-y-4">
          <PlayerPanel
            player={gameState.players[0]}
            isActive={gameState.currentPlayer === 0}
            dartsRemaining={gameState.dartsRemaining}
            batch={gameState.batch}
            batch1Score={gameState.batch1Score}
            closedNumbers={gameState.closedNumbers}
            playerIdx={0}
          />

          {/* Hint / Ring Guide moved to left panel */}
          <div className="bg-card border border-border rounded-lg p-4 hidden xl:block shadow-sm">
            <h4 className="text-sm font-bold text-foreground tracking-wider mb-3 font-mono-game">How to Play & Ring Guide</h4>
            <div className="flex flex-col gap-2 text-xs font-mono-game">
              <p><span className="font-bold text-primary">① Click dart</span> <span className="text-muted-foreground">→ spins test</span></p>
              <p><span className="font-bold text-foreground">Ring 1 (inner):</span> <span className="text-muted-foreground">14, 13</span></p>
              <p><span className="font-bold text-primary">② Click dart again</span> <span className="text-muted-foreground">→ stops &amp; throws</span></p>
              <p><span className="font-bold text-foreground">Ring 2:</span> <span className="text-muted-foreground">5, 9, 10, 11</span></p>
              <p><span className="font-bold text-primary">Hit line</span> <span className="text-muted-foreground">→ ring scored</span></p>
              <p><span className="font-bold text-foreground">Ring 3:</span> <span className="text-muted-foreground">1, 3, 12, 8</span></p>
              <p><span className="font-bold text-secondary">Filler:</span> <span className="text-muted-foreground">+2 pts per hit</span></p>
              <p><span className="font-bold text-foreground">Ring 4 (outer):</span> <span className="text-muted-foreground">7, 4, 2, 6</span></p>
            </div>
          </div>
        </div>

        {/* ===== CENTER: Dart + Dartboard + Log + Hint ===== */}
        <div className="flex-1 flex flex-col items-center order-1 xl:order-2 min-w-0">
          {/* Turn indicator (mobile) */}
          <div className="xl:hidden text-center mb-2">
            <span className="font-mono-game text-sm text-primary">
              {gameState.players[gameState.currentPlayer].name}'s turn
            </span>
            <span className="text-muted-foreground text-xs ml-2 font-mono-game">
              ({gameState.dartsRemaining} darts)
            </span>
          </div>

          {/* Dartboard + Dart Arrow (horizontal, dart on left) */}
          <Dartboard
            gameState={gameState}
            onHitNumber={handleHitNumber}
            onHitRing={handleHitRing}
            disabled={gameState.gameOver}
          />

          {/* Game Log BELOW the dartboard */}
          <div className="w-full max-w-lg mt-4">
            <GameLog messages={logMessages} />

            {/* Mobile-only Hint */}
            <div className="bg-card border border-border rounded-lg p-3 mt-3 xl:hidden">
              <h4 className="text-xs font-bold text-foreground tracking-widest mb-2 font-mono-game">How to Play</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono-game">
                <p><span className="font-bold text-primary">① Click dart</span> <span className="text-muted-foreground">→ spins</span></p>
                <p><span className="font-bold text-foreground">Ring 1:</span> <span className="text-muted-foreground">14, 13</span></p>
                <p><span className="font-bold text-primary">② Click dart again</span> <span className="text-muted-foreground">→ throws</span></p>
                <p><span className="font-bold text-foreground">Ring 2:</span> <span className="text-muted-foreground">5, 9, 10, 11</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT: Player 2 ===== */}
        <div className="xl:w-64 w-full xl:flex-shrink-0 order-3">
          <PlayerPanel
            player={gameState.players[1]}
            isActive={gameState.currentPlayer === 1}
            dartsRemaining={gameState.dartsRemaining}
            batch={gameState.batch}
            batch1Score={gameState.batch1Score}
            closedNumbers={gameState.closedNumbers}
            playerIdx={1}
          />
        </div>
      </div>
    </div>
  );
};

// ---- Individual Player Panel (extracted from Scoreboard) ----

interface PlayerPanelProps {
  player: PlayerState;
  isActive: boolean;
  dartsRemaining: number;
  batch: 1 | 2;
  batch1Score: number | null;
  closedNumbers: Set<number>;
  playerIdx: number;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player, isActive, dartsRemaining, batch, batch1Score, closedNumbers, playerIdx
}) => {
  return (
    <div className={`rounded-xl p-4 border transition-all space-y-3 ${isActive ? 'border-primary bg-primary/10 glow-green' : 'border-border bg-card'
      }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold truncate">{player.name}</h3>
        {isActive && (
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono-game whitespace-nowrap">
            🎯 {dartsRemaining} darts
          </span>
        )}
      </div>

      {/* Batch info */}
      <div className="text-center">
        <span className="font-mono-game text-xs tracking-widest text-muted-foreground uppercase">Batch {batch}</span>
        {batch === 2 && batch1Score && (
          <p className="text-xs text-accent font-mono-game mt-0.5">Target: {batch1Score} pts</p>
        )}
      </div>

      {/* Score */}
      <div className="text-3xl font-mono-game font-bold text-foreground text-center">
        {player.totalScore}
        <span className="text-sm text-muted-foreground ml-1">pts</span>
      </div>

      {/* Score breakdown */}
      <div className="space-y-1 text-xs text-muted-foreground font-mono-game border-t border-border pt-2">
        <div className="flex justify-between">
          <span>Filler</span>
          <span className="text-foreground">{player.fillerPoints}</span>
        </div>
        <div className="flex justify-between">
          <span>Top Bonus</span>
          <span className="text-accent">{player.topFillerBonuses}</span>
        </div>
        <div className="flex justify-between">
          <span>Fill-Up</span>
          <span className="text-secondary">{player.fillUpBonuses}</span>
        </div>
      </div>

      {/* Number completion grid */}
      <div className="grid grid-cols-7 gap-1 border-t border-border pt-2">
        {Array.from({ length: TOTAL_NUMBERS }, (_, idx) => idx + 1).map((num) => (
          <div
            key={num}
            className={`w-7 h-7 rounded text-[10px] font-mono-game flex items-center justify-center font-bold ${closedNumbers.has(num)
              ? 'bg-muted text-muted-foreground line-through'
              : player.completed[num]
                ? 'bg-primary/30 text-primary'
                : player.hits[num] > 0
                  ? 'bg-accent/20 text-accent'
                  : 'bg-muted/50 text-muted-foreground'
              }`}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Index;
