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
import { Palette, Settings, Volume2, Music as MusicIcon } from 'lucide-react';
import SettingsDialog from '../components/SettingsDialog';
import { useEffect, useRef } from 'react';

// Audio assets (Placeholders)
// Audio assets (Local paths in public/audio/)
const AUDIO_ASSETS = {
  throw: '/audio/throw.mp3',
  hit: '/audio/hit.mp3',
  music: {
    synth_wave: '/audio/music_synth.mp3',
    lofi_chill: '/audio/music_lofi.mp3',
    high_energy: '/audio/music_energy.mp3'
  }
};

const RulesScroll = () => (
  <div className="mt-2 text-left glass-panel p-6 rounded-2xl border-white/10 bg-black/40 space-y-4 max-h-72 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-4 duration-500">
    <h3 className="text-primary font-mono-game tracking-[0.3em] uppercase text-xs font-black border-b border-white/10 pb-3 flex items-center justify-between">
      Rules of Engagement
      <span className="text-[9px] text-white/30 animate-pulse">Scroll to read more</span>
    </h3>
    <div className="text-white/80 text-[11px] space-y-5 font-medium leading-relaxed">
      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🏹 Turn Structure
        </h4>
        <p className="pl-4 border-l border-white/10">Each player throws 3 darts per turn. Player A throws 3, then Player B. Turns alternate. Goal: Accumulate points and pass the target score.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          📊 Number Completion
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-1">
          <p>Hit each number equal to its value (e.g., 14 hits for #14).</p>
          <p>Once completed, no more filler points from that number.</p>
          <p className="text-secondary/80">Fully closed when BOTH players complete it.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          💰 Filler Points
        </h4>
        <p className="pl-4 border-l border-white/10">Every hit on an uncompleted number earns <span className="text-secondary font-bold">2 filler points</span> and counts toward its required total.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🔵 Circular Line Advantage
        </h4>
        <p className="pl-4 border-l border-white/10 italic text-white/60">Hitting a ring awards hits and filler points for ALL numbers on that ring simultaneously. Faster progress, higher strategy.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🎁 Bonus System
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-2">
          <p><strong>🔥 Top Filler (7 pts):</strong> Highest total hits on numbers 2-14.</p>
          <p><strong>⚡ Fill-Up (10 pts):</strong> Awarded to the last player to complete a number.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🏆 Batch System
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-2">
          <p><strong>Batch 1:</strong> First to exceed <strong>221.5 pts</strong> ends Batch 1 and sets the <span className="text-primary font-bold">Benchmark Bar</span>.</p>
          <p><strong>Batch 2:</strong> Opponent must surpass the Benchmark Score to win the game.</p>
        </div>
      </section>
    </div>
  </div>
);

const Index = () => {
  const [theme, setTheme] = useState<'neon' | 'avalanche' | 'gold' | 'midnight'>('neon');
  const [gameStarted, setGameStarted] = useState(false);
  const [p1Name, setP1Name] = useState('Player 1');
  const [p2Name, setP2Name] = useState('Player 2');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [showBatchOverlay, setShowBatchOverlay] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [selectedMusic, setSelectedMusic] = useState('synth_wave');

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const prevBatchRef = React.useRef<number>(1);

  // Audio Logic
  useEffect(() => {
    const unlockAudio = () => {
      if (musicRef.current && musicEnabled && gameStarted && musicRef.current.paused) {
        console.log("Unlocking audio via interaction...");
        musicRef.current.play().catch(e => console.error("Unlock failed", e));
      }
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, [musicEnabled, gameStarted]);

  useEffect(() => {
    if (musicEnabled && gameStarted) {
      console.log("Initializing music track:", selectedMusic);
      if (!musicRef.current) {
        musicRef.current = new Audio((AUDIO_ASSETS.music as any)[selectedMusic]);
        musicRef.current.loop = true;
      } else {
        musicRef.current.src = (AUDIO_ASSETS.music as any)[selectedMusic];
      }
      musicRef.current.volume = volume * 0.4;
      musicRef.current.play().catch(e => console.warn("Music play delayed until click", e));
    } else {
      if (musicRef.current) {
        musicRef.current.pause();
      }
    }
    return () => {
      if (musicRef.current) musicRef.current.pause();
    };
  }, [musicEnabled, gameStarted, selectedMusic]);

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = volume * 0.4;
    }
  }, [volume]);

  const playSFX = useCallback((type: 'throw' | 'hit') => {
    if (!sfxEnabled) return;
    console.log("Playing SFX:", type);
    const audio = new Audio(AUDIO_ASSETS[type]);
    audio.volume = volume;
    audio.play().catch(e => console.error("SFX playback failed", e));
  }, [sfxEnabled, volume]);

  useEffect(() => {
    const handleThrowSound = () => playSFX('throw');
    const handleHitSound = () => playSFX('hit');

    window.addEventListener('THROW_DART', handleThrowSound);
    window.addEventListener('DART_HIT_IMPACT', handleHitSound);

    return () => {
      window.removeEventListener('THROW_DART', handleThrowSound);
      window.removeEventListener('DART_HIT_IMPACT', handleHitSound);
    };
  }, [playSFX]);

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

    if (result.state.batch === 2 && prevBatchRef.current === 1) {
      setShowBatchOverlay(true);
    }
    prevBatchRef.current = result.state.batch;
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

    if (result.state.batch === 2 && prevBatchRef.current === 1) {
      setShowBatchOverlay(true);
    }
    prevBatchRef.current = result.state.batch;
  }, [gameState]);

  if (!gameStarted || !gameState) {
    return (
      <div className={`min-h-screen theme-${theme} transition-colors duration-700 font-sans`}>
        <div className="fixed top-6 right-6 z-50 flex gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="w-12 h-12 rounded-xl glass-panel border-white/10 text-white hover:bg-white/10"
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>
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

              <div className="flex flex-col gap-3">
                <Button onClick={startGame} className="w-full text-xl h-14 rounded-xl bg-primary hover:bg-primary/80 text-white font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] border-none" size="lg">🎯 Start Game</Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRules(!showRules)}
                  className="w-full text-xs h-10 rounded-xl border-white/10 text-white/60 hover:text-primary hover:border-primary/40 hover:bg-white/5 font-mono-game uppercase tracking-[0.2em]"
                >
                  {showRules ? 'Hide Rules 📜' : 'How to Play 📜'}
                </Button>
              </div>

              {showRules && <RulesScroll />}

              <div className="text-[10px] text-white/40 space-y-1 font-mono-game uppercase tracking-widest leading-loose pt-4 border-t border-white/5">
                <p>Target: {TARGET_SCORE} pts per batch</p>
                <p>3 darts per turn • Numbers 1–14</p>
                <p>Direct targeting protocol active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen theme-${theme} p-3 md:p-6 flex flex-col items-center transition-colors duration-700 font-sans`}>
      <div className="fixed top-6 right-6 z-50 flex gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSettingsOpen(true)}
          className="w-12 h-12 rounded-xl glass-panel border-white/10 text-white hover:bg-white/10"
        >
          <Settings className="w-6 h-6" />
        </Button>
      </div>

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

      {/* Batch Transition Overlay */}
      <BatchTransitionOverlay
        show={showBatchOverlay}
        benchmark={gameState.batch1Score || 0}
        winnerName={gameState.batch1Winner !== null ? gameState.players[gameState.batch1Winner].name : ''}
        opponentName={gameState.batch1Winner !== null ? gameState.players[1 - gameState.batch1Winner].name : ''}
        onClose={() => setShowBatchOverlay(false)}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        volume={volume}
        onVolumeChange={setVolume}
        musicEnabled={musicEnabled}
        onMusicToggle={setMusicEnabled}
        sfxEnabled={sfxEnabled}
        onSfxToggle={setSfxEnabled}
        selectedMusic={selectedMusic}
        onMusicChange={setSelectedMusic}
      />
    </div>
  );
};

// Sub-components

const RulesScroll_REDUNDANT = () => (
  <div className="mt-2 text-left glass-panel p-6 rounded-2xl border-white/10 bg-black/40 space-y-4 max-h-72 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-4 duration-500">
    <h3 className="text-primary font-mono-game tracking-[0.3em] uppercase text-xs font-black border-b border-white/10 pb-3 flex items-center justify-between">
      Rules of Engagement
      <span className="text-[9px] text-white/30 animate-pulse">Scroll to read more</span>
    </h3>
    <div className="text-white/80 text-[11px] space-y-5 font-medium leading-relaxed">
      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🏹 Turn Structure
        </h4>
        <p className="pl-4 border-l border-white/10">Each player throws 3 darts per turn. Player A throws 3, then Player B. Turns alternate. Goal: Accumulate points and pass the target score.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          📊 Number Completion
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-1">
          <p>Hit each number equal to its value (e.g., 14 hits for #14).</p>
          <p>Once completed, no more filler points from that number.</p>
          <p className="text-secondary/80">Fully closed when BOTH players complete it.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          💰 Filler Points
        </h4>
        <p className="pl-4 border-l border-white/10">Every hit on an uncompleted number earns <span className="text-secondary font-bold">2 filler points</span> and counts toward its required total.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🔵 Circular Line Advantage
        </h4>
        <p className="pl-4 border-l border-white/10 italic text-white/60">Hitting a ring awards hits and filler points for ALL numbers on that ring simultaneously. Faster progress, higher strategy.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🎁 Bonus System
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-2">
          <p><strong>🔥 Top Filler (7 pts):</strong> Highest total hits on numbers 2-14.</p>
          <p><strong>⚡ Fill-Up (10 pts):</strong> Awarded to the last player to complete a number.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🏆 Batch System
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-2">
          <p><strong>Batch 1:</strong> First to exceed <strong>221.5 pts</strong> ends Batch 1 and sets the <span className="text-primary font-bold">Benchmark Bar</span>.</p>
          <p><strong>Batch 2:</strong> Opponent must surpass the Benchmark Score to win the game.</p>
        </div>
      </section>
    </div>
  </div>
);

const RingGuide = () => (
  <div className="glass-panel rounded-2xl p-6 hidden xl:block border-white/5">
    <h4 className="text-[10px] font-bold text-primary tracking-[0.2em] mb-4 font-mono-game uppercase opacity-80">Ring Layout Guide</h4>
    <div className="flex flex-col gap-3 text-[10px] font-mono-game uppercase tracking-widest text-white/50">
      <div className="flex justify-between items-center"><span className="text-white/70">Ring 1 (Inner):</span> <span className="text-primary">14, 13</span></div>
      <div className="flex justify-between items-center"><span className="text-white/70">Ring 2:</span> <span className="text-primary">12, 9, 5, 10</span></div>
      <div className="flex justify-between items-center"><span className="text-white/70">Ring 3:</span> <span className="text-primary">11, 1, 3, 8</span></div>
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
                ? 'bg-primary text-white scale-110 shadow-[0_0_15px_rgba(232,65,66,0.6)] z-10'
                : player.hits[num] > 0
                  ? 'bg-secondary text-black scale-105 shadow-[0_0_10px_rgba(255,180,0,0.4)]'
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

const BatchTransitionOverlay = ({ show, benchmark, winnerName, opponentName, onClose }: {
  show: boolean,
  benchmark: number,
  winnerName: string,
  opponentName: string,
  onClose: () => void
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
      <div className="max-w-2xl w-full glass-panel p-12 rounded-[3rem] border-2 border-primary neon-border-theme flex flex-col items-center text-center gap-8 shadow-2xl animate-in zoom-in slide-in-from-bottom-12 duration-700">
        <div className="space-y-2">
          <h2 className="text-6xl font-black italic tracking-tighter text-primary text-glow-theme animate-bounce">
            BATCH 1 ACHIEVED!
          </h2>
          <p className="text-white/60 font-mono-game uppercase tracking-[0.4em] text-sm">Target {TARGET_SCORE} exceeded</p>
        </div>

        <div className="w-full h-px bg-white/10" />

        <div className="space-y-6">
          <p className="text-2xl text-white font-bold leading-relaxed px-4">
            <span className="text-secondary">{winnerName}</span> set the Benchmark Bar at <span className="text-primary text-3xl">{benchmark}</span>!
          </p>

          <div className="glass-panel p-8 rounded-2xl border-white/5 bg-white/5 space-y-4">
            <h3 className="text-primary font-mono-game tracking-[0.3em] uppercase text-xs font-bold">Batch 2 Instructions (Qualification Round)</h3>
            <ul className="text-white/80 text-sm space-y-3 font-medium leading-relaxed">
              <li className="flex items-start gap-3 justify-center">
                <span className="text-primary font-bold">1.</span>
                <span>{opponentName} takes the turn from 0 points.</span>
              </li>
              <li className="flex items-start gap-3 justify-center">
                <span className="text-primary font-bold">2.</span>
                <span>Surpass the target of <span className="text-primary font-bold">{benchmark}</span> to WIN immediately!</span>
              </li>
              <li className="flex items-start gap-3 justify-center">
                <span className="text-primary font-bold">3.</span>
                <span>If board closes before beating the target, <span className="text-primary font-bold">{winnerName}</span> wins the game.</span>
              </li>
            </ul>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="bg-primary hover:bg-primary/80 text-white font-black px-12 py-8 text-2xl rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all animate-pulse"
        >
          GO BATCH 2! 🎯
        </Button>
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

export default Index;
