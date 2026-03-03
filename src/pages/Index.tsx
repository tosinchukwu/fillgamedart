import React, { useState, useCallback, useEffect, useRef } from 'react';
import Dartboard, { DartArrow } from '../components/Dartboard';
import GameLog from '../components/GameLog';
import MasterScoringTable from '../components/MasterScoringTable';
import { createInitialGameState, hitNumber, hitRing, GameState, PlayerState, computeCPUMove } from '../game/gameLogic';
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
import { Palette, Settings, Volume2, Music as MusicIcon, Wallet, CheckCircle2, XCircle, Share2, Loader2 } from 'lucide-react';
import SettingsDialog from '../components/SettingsDialog';
import { useAccount, useDisconnect, useSendTransaction } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { encodeFunctionData, parseEther, stringToHex } from 'viem';

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
          <p><strong>🔥 Top Filler (7 pts):</strong> Awarded per number (1–14). Earned if you have the most hits on that specific number. Shared (3.5 each) if hits are equal.</p>
          <p><strong>⚡ Fill-Up (10 pts):</strong> Awarded to the <span className="text-primary font-bold">last player</span> to complete a number. This fully closes the number for the board.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🏆 Batch System (Final Race)
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-2">
          <p><strong>Batch 1:</strong> First to exceed <strong>221.5 pts</strong> ends the round. Both scores are recorded.</p>
          <p><strong>Batch 2 (The Race):</strong> Each player now has a <span className="text-primary font-bold">Unique Target</span>: your opponent's final Batch 1 score.</p>
          <p className="text-secondary font-bold">First to surpass their opponent's record wins the entire game immediately.</p>
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
  const [p1Address, setP1Address] = useState<string | null>(null);
  const [p2Address, setP2Address] = useState<string | null>(null);
  const [isVsCPU, setIsVsCPU] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [showBatchOverlay, setShowBatchOverlay] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [selectedMusic, setSelectedMusic] = useState('synth_wave');

  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();
  const { sendTransaction, data: txHash, isPending: isBroadcasting, isSuccess: isBroadcasted } = useSendTransaction();

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const prevBatchRef = useRef<number>(1);

  // Audio Logic
  useEffect(() => {
    const unlockAudio = () => {
      if (musicRef.current && musicEnabled && gameStarted && musicRef.current.paused) {
        musicRef.current.play().catch(e => console.error("Unlock failed", e));
      }
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, [musicEnabled, gameStarted]);

  useEffect(() => {
    if (musicEnabled && gameStarted) {
      if (!musicRef.current) {
        musicRef.current = new Audio((AUDIO_ASSETS.music as any)[selectedMusic]);
        musicRef.current.loop = true;
      } else {
        musicRef.current.src = (AUDIO_ASSETS.music as any)[selectedMusic];
      }
      musicRef.current.volume = volume * 0.4;
      musicRef.current.play().catch(e => console.warn("Music play delayed", e));
    } else {
      if (musicRef.current) musicRef.current.pause();
    }
  }, [musicEnabled, gameStarted, selectedMusic, volume]);

  const playSFX = useCallback((type: 'throw' | 'hit') => {
    if (!sfxEnabled) return;
    const audio = new Audio(AUDIO_ASSETS[type]);
    audio.volume = volume;
    audio.play().catch(e => console.error("SFX failed", e));
  }, [sfxEnabled, volume]);

  useEffect(() => {
    const handleThrow = () => playSFX('throw');
    const handleHit = () => playSFX('hit');
    window.addEventListener('THROW_DART', handleThrow);
    window.addEventListener('DART_HIT_IMPACT', handleHit);
    return () => {
      window.removeEventListener('THROW_DART', handleThrow);
      window.removeEventListener('DART_HIT_IMPACT', handleHit);
    };
  }, [playSFX]);

  const startGame = () => {
    if (!p1Address || !p2Address) return;
    setGameState(createInitialGameState(p1Name, p1Address, p2Name, p2Address, false));
    setLogMessages([]);
    setGameStarted(true);
  };

  const startSoloGame = () => {
    setIsVsCPU(true);
    setGameState(createInitialGameState('Guest', '0xGUEST', 'Computer AI', '0xCOMPUTER', true));
    setLogMessages([]);
    setGameStarted(true);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameState(null);
    setShowBatchOverlay(false);
    prevBatchRef.current = 1;
  };

  const handleHitNumber = useCallback((num: number) => {
    if (!gameState || gameState.gameOver) return;
    const result = hitNumber(gameState, num);
    setGameState(result.state);
    if (result.state.lastAction) setLogMessages(p => [...p, result.state.lastAction!]);
    if (result.state.batch === 2 && prevBatchRef.current === 1) setShowBatchOverlay(true);
    prevBatchRef.current = result.state.batch;
  }, [gameState]);

  const handleHitRing = useCallback((ringIdx: number) => {
    if (!gameState || gameState.gameOver) return;
    const nums = RING_NUMBERS[ringIdx];
    const result = hitRing(gameState, ringIdx, nums);
    setGameState(result.state);
    if (result.state.lastAction) setLogMessages(p => [...p, result.state.lastAction!, ...result.messages.map(m => ` → ${m}`)]);
    if (result.state.batch === 2 && prevBatchRef.current === 1) setShowBatchOverlay(true);
    prevBatchRef.current = result.state.batch;
  }, [gameState]);

  useEffect(() => {
    if (gameStarted && gameState && gameState.isVsCPU && gameState.currentPlayer === 1 && !gameState.gameOver && gameState.dartsRemaining > 0) {
      const timer = setTimeout(() => {
        const move = computeCPUMove(gameState);
        window.dispatchEvent(new CustomEvent('THROW_DART'));
        setTimeout(() => {
          if (move.type === 'number') handleHitNumber(move.index);
          else handleHitRing(move.index);
        }, 1000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameStarted, gameState?.currentPlayer, gameState?.dartsRemaining, gameState?.gameOver, handleHitNumber, handleHitRing]);

  const broadcastScore = async () => { /* ... (broadcasting logic) */ };

  if (!gameStarted || !gameState) {
    return (
      <div className={`min-h-screen theme-${theme} transition-colors duration-700 font-sans`}>
        <div className="fixed top-6 right-6 z-50 flex gap-3">
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 rounded-xl glass-panel border-white/10 text-white">
            <Settings className="w-6 h-6" />
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md space-y-8 text-center glass-panel p-10 rounded-[2rem] neon-border-theme">
            <h1 className="text-6xl text-white tracking-[0.2em] mb-2">FILLING GAME</h1>
            <p className="text-primary text-sm font-mono-game uppercase tracking-[0.3em] opacity-80">Strategic Dart Simulation</p>
            <div className="space-y-4 pt-4">
              {/* Wallet registration slots */}
              <div className="grid gap-4">
                <Button onClick={() => isConnected ? setP1Address(address!) : open()} variant="outline" className="h-12 border-white/10 text-white/60">
                  {p1Address ? `P1: ${p1Address.slice(0, 6)}...` : 'Link P1 Wallet'}
                </Button>
                <Button onClick={() => isConnected ? setP2Address(address!) : open()} variant="outline" className="h-12 border-white/10 text-white/60">
                  {p2Address ? `P2: ${p2Address.slice(0, 6)}...` : 'Link P2 Wallet'}
                </Button>
              </div>
              <Button onClick={startGame} disabled={!p1Address || !p2Address} className="w-full h-14 bg-primary text-white font-black text-xl rounded-xl">🎯 Start Match</Button>
              <div className="flex gap-2">
                <Button onClick={startSoloGame} className="flex-1 bg-white/10 text-white font-mono-game uppercase tracking-widest text-xs">🤖 Solo vs CPU</Button>
                <Button onClick={() => setShowRules(!showRules)} variant="outline" className="flex-1 border-white/10 text-white/60 text-xs">📜 Rules</Button>
              </div>
              {showRules && <RulesScroll />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen theme-${theme} p-3 md:p-6 flex flex-col items-center transition-colors duration-700 font-sans overflow-hidden`}>
      <div className="fixed top-6 right-6 z-50">
        <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 rounded-xl glass-panel border-white/10 text-white"><Settings className="w-6 h-6" /></Button>
      </div>

      <div className="w-full max-w-[1800px] flex flex-col items-center gap-4 mb-8">
        <h1 className="text-4xl md:text-5xl text-white tracking-[0.25em] text-center">FILLING GAME</h1>
        <div className="flex items-center gap-6 glass-panel py-2 px-6 rounded-full border-white/10">
          <span className="font-mono-game text-[10px] tracking-[0.2em] text-primary animate-pulse uppercase">{gameState.players[gameState.currentPlayer].name}'S TURN</span>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-white/60 text-[10px] font-mono-game tracking-[0.2em] uppercase">{gameState.dartsRemaining} DARTS REMAINING</span>
          <Button variant="ghost" size="sm" onClick={resetGame} className="text-[9px] uppercase tracking-widest text-white/40 hover:text-primary h-6">New Game</Button>
        </div>
      </div>

      {gameState.gameOver && gameState.winner !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-panel p-12 rounded-[2rem] border-primary text-center neon-border-theme">
            <h2 className="text-6xl text-primary font-black italic mb-4 uppercase">{gameState.players[gameState.winner].name} WINS!</h2>
            <p className="text-white/60 font-mono-game uppercase tracking-widest mb-8">Final Score: {gameState.players[gameState.winner].totalScore} pts</p>
            <Button onClick={resetGame} className="bg-primary text-white font-black px-12 py-6 text-xl rounded-xl">Play Again</Button>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1700px] flex flex-col xl:flex-row gap-6 items-stretch justify-center h-[calc(100vh-220px)] min-h-[600px]">
        {/* Left: Log */}
        <div className="xl:w-[320px] w-full flex-shrink-0 flex flex-col h-full order-2 xl:order-1">
          <div className="glass-panel rounded-3xl flex-1 flex flex-col border-white/10 overflow-hidden shadow-2xl">
            <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/40">Game Activity Log</h3>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
            <div className="flex-1 overflow-hidden h-full">
              <GameLog messages={logMessages} p1Name={gameState.players[0].name} p2Name={gameState.players[1].name} />
            </div>
          </div>
        </div>

        {/* Center: Board */}
        <div className="flex-1 flex flex-col items-center justify-between min-w-0 order-1 xl:order-2 py-4">
          <div className="flex-1 flex items-center justify-center">
            <Dartboard gameState={gameState} onHitNumber={handleHitNumber} onHitRing={handleHitRing} disabled={gameState.gameOver} />
          </div>
          <div className="flex flex-col items-center gap-6 w-full max-w-md mt-6 h-48">
            <DartArrow boardPhase={gameState.dartsRemaining > 0 ? 'idle' : 'throwing'} isFlying={false} isVisible={!gameState.gameOver} disabled={gameState.gameOver || gameState.currentPlayer === 1} onClick={() => window.dispatchEvent(new CustomEvent('THROW_DART'))} playerIdx={gameState.currentPlayer} />
            <div className="text-center glass-panel px-10 py-5 rounded-3xl border-white/10 hover:bg-white/10 transition-colors cursor-pointer group active:scale-95 shadow-2xl min-w-[220px]" onClick={() => !gameState.gameOver && gameState.dartsRemaining > 0 && window.dispatchEvent(new CustomEvent('THROW_DART'))}>
              <span className="text-sm font-black tracking-[0.3em] text-primary uppercase">{gameState.dartsRemaining > 0 ? 'Launch Dart' : 'Turn Ending...'}</span>
            </div>
          </div>
        </div>

        {/* Right: Table */}
        <div className="xl:w-[620px] w-full flex-shrink-0 order-3 flex flex-col h-full shadow-2xl">
          <MasterScoringTable gameState={gameState} />
        </div>
      </div>

      <BatchTransitionOverlay show={showBatchOverlay} benchmark={gameState.batch1Score || 0} winnerName={gameState.batch1Winner !== null ? gameState.players[gameState.batch1Winner].name : ''} opponentName={gameState.batch1Winner !== null ? gameState.players[1 - gameState.batch1Winner].name : ''} onClose={() => setShowBatchOverlay(false)} />

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} theme={theme} onThemeChange={setTheme} volume={volume} onVolumeChange={setVolume} musicEnabled={musicEnabled} onMusicToggle={setMusicEnabled} sfxEnabled={sfxEnabled} onSfxToggle={setSfxEnabled} selectedMusic={selectedMusic} onMusicChange={setSelectedMusic} />
    </div>
  );
};

const BatchTransitionOverlay = ({ show, benchmark, winnerName, opponentName, onClose }: any) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="max-w-2xl w-full glass-panel p-12 rounded-[3rem] border-2 border-primary text-center space-y-8 animate-in zoom-in slide-in-from-bottom-12">
        <h2 className="text-5xl font-black italic text-primary text-glow-theme">BATCH 1 ACHIEVED!</h2>
        <p className="text-white font-bold text-xl">The Bar is set at {benchmark} pts. Match point transition: BEAT THE BAR.</p>
        <div className="glass-panel p-6 bg-white/5 rounded-2xl text-left text-sm text-white/80 leading-relaxed">
          <p><strong>Step 1:</strong> Batch 1 scores recorded.</p>
          <p><strong>Step 2:</strong> Your opponent's score is your NEW target score.</p>
          <p><strong>Step 3:</strong> First to surpass their target wins immediately.</p>
        </div>
        <Button onClick={onClose} className="bg-primary hover:bg-primary/80 text-white font-black px-12 py-8 text-2xl rounded-2xl shadow-xl w-full">GO BATCH 2! 🎯</Button>
      </div>
    </div>
  );
};

export default Index;
