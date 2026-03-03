import React, { useState, useCallback } from 'react';
import Dartboard, { DartArrow } from '../components/Dartboard';
import GameLog from '../components/GameLog';
import { createInitialGameState, hitNumber, hitRing, GameState, PlayerState } from '../game/gameLogic';
import { RING_NUMBERS, TARGET_SCORE, TOTAL_NUMBERS } from '../game/boardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Palette } from 'lucide-react';

const Index = () => {
  const [theme, setTheme] = useState<'neon' | 'avalanche' | 'gold' | 'midnight'>('neon');
  const [gameStarted, setGameStarted] = useState(false);
  const [p1Name, setP1Name] = useState('Player 1');
  const [p2Name, setP2Name] = useState('Player 2');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [activeNotification, setActiveNotification] = useState<{ message: string, detail: string, timestamp: number } | null>(null);

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
    if (result.state.lastAction) {
      setLogMessages(prev => [...prev, result.state.lastAction!]);
    }
    if (result.state.lastHit) {
      setActiveNotification({
        message: result.state.lastHit.value === "BATCH 2 STARTED!" ? "BATCH 2 STARTED!" : `DIRECT HIT: ${result.state.lastHit.value}`,
        detail: result.state.lastHit.value === "BATCH 2 STARTED!" ? "First to 250 wins! Scores reset." : result.state.lastHit.player,
        timestamp: result.state.lastHit.timestamp
      });
    }
  }, [gameState]);

  const handleHitRing = useCallback((ringIndex: number) => {
    if (!gameState || gameState.gameOver) return;
    const nums = RING_NUMBERS[ringIndex];
    if (!nums || nums.length === 0) return;
    const result = hitRing(gameState, ringIndex, nums);
    setGameState(result.state);
    if (result.state.lastAction) {
      setLogMessages(prev => [...prev, result.state.lastAction!, ...result.messages.map(m => `  → ${m}`)]);
    }
    if (result.state.lastHit) {
      setActiveNotification({
        message: `RING ${ringIndex + 1} HIT!`,
        detail: result.state.lastHit.player,
        timestamp: result.state.lastHit.timestamp
      });
    }
  }, [gameState]);

  if (!gameStarted || !gameState) {
    return (
      <div className={`min-h-screen theme-${theme} transition-colors duration-700 font-sans`}>
        <ThemeSwitcher current={theme} onSelect={setTheme} />
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md space-y-8 text-center glass-panel p-10 rounded-[2rem] neon-border-theme">
            <div>
              <h1 className="text-6xl text-white tracking-[0.2em] text-glow-white mb-2">FILLING GAME</h1>
              <p className="text-primary text-sm font-mono-game uppercase tracking-[0.3em] text-glow-theme opacity-80">Strategic Dart Simulation</p>
            </div>

            <div className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-mono-game ml-2">Player 1 Name</label>
                  <Input value={p1Name} onChange={(e) => setP1Name(e.target.value)} className="mt-1 bg-white/5 border-white/10 text-white focus:border-primary h-12 rounded-xl" placeholder="Player 1" />
                </div>
                <div className="text-left">
                  <label className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-mono-game ml-2">Player 2 Name</label>
                  <Input value={p2Name} onChange={(e) => setP2Name(e.target.value)} className="mt-1 bg-white/5 border-white/10 text-white focus:border-primary h-12 rounded-xl" placeholder="Player 2" />
                </div>
              </div>
              <Button onClick={startGame} className="w-full text-xl h-14 rounded-xl bg-primary hover:bg-primary/80 text-white font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] border-none" size="lg">🎯 Start Game</Button>
            </div>

            <div className="text-[10px] text-white/40 space-y-1 font-mono-game uppercase tracking-widest leading-loose">
              <p>Target: {TARGET_SCORE} pts per batch</p>
              <p>3 darts per turn • Numbers 1–14</p>
              <p>Direct targeting protocol active</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen theme-${theme} p-3 md:p-6 flex flex-col items-center transition-colors duration-700 font-sans`}>
      <ThemeSwitcher current={theme} onSelect={setTheme} />

      {/* Header */}
      <div className="w-full max-w-7xl flex flex-col items-center gap-4 mb-8">
        <h1 className="text-4xl md:text-5xl text-white tracking-[0.25em] text-glow-white text-center">FILLING GAME</h1>
        <div className="flex items-center gap-6 glass-panel py-2 px-6 rounded-full border-white/10">
          <span className="font-mono-game text-[10px] tracking-[0.2em] text-primary animate-pulse uppercase">
            {gameState.players[gameState.currentPlayer].name}'S TURN
          </span>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-white/60 text-[10px] font-mono-game tracking-[0.2em] uppercase">
            {gameState.dartsRemaining} DARTS REMAINING
          </span>
          <Button variant="ghost" size="sm" onClick={resetGame} className="text-[9px] uppercase tracking-widest text-white/40 hover:text-primary hover:bg-white/5 px-4 h-6">New Game</Button>
        </div>
      </div>

      {/* Game Over Banner */}
      {gameState.gameOver && gameState.winner !== null && (
        <div className="max-w-7xl mx-auto mb-8 bg-primary/10 border border-primary/30 rounded-2xl p-8 text-center glass-panel neon-border-theme">
          <h2 className="text-5xl text-primary text-glow-theme mb-2">
            {gameState.players[gameState.winner].name} WINS!
          </h2>
          <p className="text-white/60 font-mono-game uppercase tracking-widest text-sm mb-6">
            Final Score: {gameState.players[gameState.winner].totalScore} pts
          </p>
          <Button onClick={resetGame} className="bg-primary hover:bg-primary/80 font-bold px-8 py-6 text-lg rounded-xl">Play Again</Button>
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="max-w-7xl w-full mx-auto flex flex-col xl:flex-row gap-6 items-start justify-center">

        {/* ===== LEFT: Player 1 ===== */}
        <div className="xl:w-72 w-full xl:flex-shrink-0 order-2 xl:order-1 space-y-4">
          <PlayerPanel
            player={gameState.players[0]}
            isActive={gameState.currentPlayer === 0}
            dartsRemaining={gameState.dartsRemaining}
            batch={gameState.batch}
            batch1Score={gameState.batch1Score}
            closedNumbers={gameState.closedNumbers}
            playerIdx={0}
          />

          <RingGuide />
        </div>

        {/* ===== CENTER: Dartboard & Logs ===== */}
        <div className="flex-1 flex flex-col items-center order-1 xl:order-2 min-w-0">
          <Dartboard
            gameState={gameState}
            onHitNumber={handleHitNumber}
            onHitRing={handleHitRing}
            disabled={gameState.gameOver}
          />

          <div className="w-full mt-8 flex flex-row items-center gap-6 justify-center">
            <div className="max-w-lg w-full flex-1">
              <GameLog messages={logMessages} />
            </div>
          </div>
        </div>

        {/* ===== RIGHT: Player 2 ===== */}
        <div className="xl:w-72 w-full xl:flex-shrink-0 order-3">
          <PlayerPanel
            player={gameState.players[1]}
            isActive={gameState.currentPlayer === 1}
            dartsRemaining={gameState.dartsRemaining}
            batch={gameState.batch}
            batch1Score={gameState.batch1Score}
            closedNumbers={gameState.closedNumbers}
            playerIdx={1}
          />

          {/* Standalone Throwing Controls */}
          <div className="pt-6 mt-2 flex flex-col items-center gap-6">
            <div className="text-center glass-panel px-4 py-2 rounded-lg border-white/10 w-full mb-2">
              <span className="text-[10px] font-mono leading-tight tracking-[0.2em] text-white uppercase opacity-60">
                Current Weapon: {gameState.players[gameState.currentPlayer].name}
              </span>
            </div>
            <DartArrow
              boardPhase={gameState.dartsRemaining > 0 ? 'idle' : 'throwing'}
              isFlying={false}
              isVisible={!gameState.gameOver}
              disabled={gameState.gameOver || gameState.dartsRemaining === 0}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('THROW_DART'));
              }}
              playerIdx={gameState.currentPlayer}
            />
            <div className="text-center glass-panel px-8 py-4 rounded-2xl border-white/10 hover:bg-white/10 transition-colors cursor-pointer group active:scale-95 shadow-xl"
              onClick={(e) => {
                e.stopPropagation();
                if (!gameState.gameOver && gameState.dartsRemaining > 0) {
                  window.dispatchEvent(new CustomEvent('THROW_DART'));
                }
              }}>
              <span className="text-[12px] font-bold leading-tight tracking-[0.3em] text-primary uppercase group-hover:text-glow-theme transition-all">
                {gameState.dartsRemaining > 0 ? 'Launch Dart' : 'End Turn...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hit Notification Overlay */}
      <HitNotification notification={activeNotification} onComplete={() => setActiveNotification(null)} />
    </div>
  );
};

// Sub-components

const RingGuide = () => (
  <div className="glass-panel rounded-2xl p-6 hidden xl:block border-white/5">
    <h4 className="text-[10px] font-bold text-primary tracking-[0.2em] mb-4 font-mono-game uppercase opacity-80">Ring Layout Guide</h4>
    <div className="flex flex-col gap-3 text-[10px] font-mono-game uppercase tracking-widest text-white/50">
      <div className="flex justify-between items-center"><span className="text-white/70">Ring 1 (Inner):</span> <span className="text-primary">14, 13</span></div>
      <div className="flex justify-between items-center"><span className="text-white/70">Ring 2:</span> <span className="text-primary">5, 9, 10, 11</span></div>
      <div className="flex justify-between items-center"><span className="text-white/70">Ring 3:</span> <span className="text-primary">1, 3, 12, 8</span></div>
      <div className="flex justify-between items-center"><span className="text-white/70">Ring 4 (Outer):</span> <span className="text-primary">7, 4, 2, 6</span></div>
      <div className="h-px bg-white/5 my-2" />
      <p className="text-[9px] leading-relaxed italic opacity-60">Impacts on boundary lines award the entire ring group.</p>
    </div>
  </div>
);

const PlayerPanel: React.FC<{
  player: PlayerState;
  isActive: boolean;
  dartsRemaining: number;
  batch: number;
  batch1Score: number | null;
  closedNumbers: Set<number>;
  playerIdx: number;
}> = ({ player, isActive, dartsRemaining, batch, batch1Score, closedNumbers, playerIdx }) => {
  return (
    <div className={`rounded-2xl p-6 transition-all space-y-5 glass-panel ${isActive ? 'neon-border-theme ring-1 ring-primary/20 scale-[1.02]' : 'border-white/10 opacity-60'}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold tracking-tight ${isActive ? 'text-primary text-shadow-glow' : 'text-white'}`}>{player.name}</h3>
        {isActive && (
          <div className="flex gap-2">
            {Array.from({ length: dartsRemaining }).map((_, i) => (
              <img
                key={i}
                src={playerIdx === 0 ? "/green_dart.png" : "/red_dart.png"}
                alt="Dart"
                className="w-5 h-8 object-contain"
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-end border-b border-white/5 pb-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono-game uppercase tracking-[0.2em] text-white/40 mb-1">Current Score</span>
          <div className="text-4xl font-mono-game font-bold text-white leading-none">
            {player.totalScore}
            <span className="text-sm text-white/30 ml-2">pts</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono-game uppercase tracking-[0.2em] text-white/40 mb-1">Batch {batch}</span>
          <span className="text-[10px] text-primary font-mono-game font-bold px-2 py-0.5 bg-primary/10 rounded">
            Target: {batch === 1 ? TARGET_SCORE : 250}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-[10px] font-mono-game uppercase tracking-widest text-white/40">
        <div className="flex justify-between border-b border-white/5 pb-1"><span>Filler</span> <span className="text-white">{player.fillerPoints}</span></div>
        <div className="flex justify-between border-b border-white/5 pb-1"><span>Top Bonus</span> <span className="text-primary">{player.topFillerBonuses}</span></div>
        <div className="flex justify-between border-b border-white/5 pb-1"><span>Fill-Up</span> <span className="text-secondary">{player.fillUpBonuses}</span></div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 pt-2">
        {Array.from({ length: TOTAL_NUMBERS }, (_, idx) => idx + 1).map((num) => (
          <div
            key={num}
            className={`w-full aspect-square rounded-md text-[9px] font-mono-game flex items-center justify-center font-bold transition-all ${closedNumbers.has(num)
              ? 'bg-white/5 text-white/20 line-through'
              : player.completed[num]
                ? 'bg-primary/30 text-primary shadow-[inset_0_0_10px_rgba(232,65,66,0.2)]'
                : player.hits[num] > 0
                  ? 'bg-white/10 text-white shadow-[inset_0_0_8px_rgba(255,255,255,0.1)]'
                  : 'bg-white/5 text-white/30'
              }`}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};

const ThemeSwitcher = ({ current, onSelect }: { current: string, onSelect: (t: any) => void }) => {
  const themes = [
    { id: 'neon', label: 'Neon Space', color: '#00f2fe' },
    { id: 'avalanche', label: 'Avalanche', color: '#E84142' },
    { id: 'gold', label: 'Cyber Gold', color: '#ffb400' },
    { id: 'midnight', label: 'Deep Sea', color: '#00ff88' },
  ];

  return (
    <div className="fixed top-6 right-6 z-50">
      <Select value={current} onValueChange={onSelect}>
        <SelectTrigger className="w-[180px] glass-panel border-white/10 text-white rounded-xl h-11 focus:ring-primary/50">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <SelectValue placeholder="Select Theme" />
          </div>
        </SelectTrigger>
        <SelectContent className="glass-panel border-white/10 text-white rounded-xl overflow-hidden">
          {themes.map((t) => (
            <SelectItem
              key={t.id}
              value={t.id}
              className="focus:bg-white/10 focus:text-white cursor-pointer py-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: t.color, color: t.color }} />
                <span className="text-[11px] font-mono-game uppercase tracking-widest">{t.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const HitNotification = ({ notification, onComplete }: { notification: any, onComplete: () => void }) => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onComplete, 500); // Wait for fade out
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [notification, onComplete]);

  if (!notification || !visible) return null;

  const isBatch = notification.message === "BATCH 2 STARTED!";

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-[100] animate-in fade-in zoom-in duration-300">
      <div className={`p-12 rounded-[3rem] glass-panel border-2 ${isBatch ? 'border-secondary neon-border-secondary' : 'border-primary neon-border-theme'} flex flex-col items-center gap-4 transition-all scale-110 shadow-2xl bg-black/40 backdrop-blur-xl`}>
        <h2 className={`text-7xl font-black italic tracking-tighter ${isBatch ? 'text-secondary text-glow-secondary' : 'text-primary text-glow-theme'} animate-bounce`}>
          {notification.message}
        </h2>
        <p className="text-white/80 font-mono-game uppercase tracking-[0.4em] text-lg">
          {notification.detail}
        </p>
      </div>
    </div>
  );
};

export default Index;
