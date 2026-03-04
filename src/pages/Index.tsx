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
import { Palette, Settings, Volume2, Music as MusicIcon, Wallet, CheckCircle2, XCircle, Share2, Loader2, Twitter, Facebook, Instagram, Send } from 'lucide-react';
import SettingsDialog from '../components/SettingsDialog';
import { useAccount, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { encodeFunctionData, parseEther, stringToHex } from 'viem';
import { avalanche } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../lib/constants';
import { toast } from "sonner";

// Audio assets (Local paths in public/audio/)
const AUDIO_ASSETS = {
  throw: '/audio/throw.mp3',
  hit: '/audio/hit.mp3',
  music: {
    synth_wave: '/audio/music_synth.mp3',
    lofi_chill: '/audio/music_lofi.mp3',
    high_energy: '/audio/music_energy.mp3',
    stand_up: '/audio/standup.mp3'
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
          <p><strong>🔥 Top Filler (7 pts):</strong> Awarded per number (<span className="text-secondary font-bold">2–14</span>). Earned if you have the most hits on that specific number. Shared (3.5 each) if hits are equal.</p>
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
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [p1Address, setP1Address] = useState<string | null>(null);
  const [p2Address, setP2Address] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState<'solo' | 'multi'>('solo');
  const [isVsCPU, setIsVsCPU] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchId, setMatchId] = useState('');
  const [isLobbyJoined, setIsLobbyJoined] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [showBatchOverlay, setShowBatchOverlay] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [selectedMusic, setSelectedMusic] = useState('synth_wave');
  const [isDartFlying, setIsDartFlying] = useState(false);

  useEffect(() => {
    const handleImpact = () => setIsDartFlying(false);
    const handleThrow = () => setIsDartFlying(true);
    window.addEventListener('DART_HIT_IMPACT', handleImpact);
    window.addEventListener('THROW_DART', handleThrow);
    return () => {
      window.removeEventListener('DART_HIT_IMPACT', handleImpact);
      window.removeEventListener('THROW_DART', handleThrow);
    };
  }, []);

  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();

  // Safe Match ID parsing
  const parsedMatchId = (() => {
    try {
      return matchId && !isNaN(Number(matchId.trim())) ? BigInt(matchId.trim()) : undefined;
    } catch {
      return undefined;
    }
  })();

  // Real-time Match Data
  const { data: contractMatch, refetch: refetchMatch, isLoading: isLoadingMatch, error: matchError } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getMatch',
    args: parsedMatchId !== undefined ? [parsedMatchId] : undefined,
    query: {
      enabled: !!parsedMatchId && setupMode === 'multi' && isLobbyJoined,
      refetchInterval: 3000,
    }
  });

  useEffect(() => {
    if (matchError) {
      console.error("Match Lookup Error:", matchError);
    }
  }, [matchError]);

  // Verify match existence (ID should be non-zero)
  const isMatchValid = contractMatch && (contractMatch as any).id !== 0n;

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const prevBatchRef = useRef<number>(1);

  // Manual start only
  const startGame = () => {
    if (!contractMatch) return;

    const m = contractMatch as any;
    setIsVsCPU(false);
    setGameState(createInitialGameState(
      m.player1Name || 'Player 1',
      m.player1,
      m.player2Name || 'Player 2',
      m.player2,
      false
    ));
    setLogMessages([]);
    setGameStarted(true);
  };

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

  const startSoloGame = () => {
    setIsVsCPU(true);
    const player1Name = p1Name.trim() || (isConnected && address ? 'You' : 'Guest');
    const player1Address = isConnected && address ? address : '0x0000000000000000000000000000000000000001';
    setGameState(createInitialGameState(player1Name, player1Address, 'Computer AI (CPU)', '0x0000000000000000000000000000000000000000', true));
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
    setGameState(prev => {
      if (!prev || prev.gameOver) return prev;
      const result = hitNumber(prev, num);
      if (result.state.lastAction) setLogMessages(p => [...p, result.state.lastAction!]);
      if (result.state.batch === 2 && prevBatchRef.current === 1) setShowBatchOverlay(true);
      prevBatchRef.current = result.state.batch;
      return result.state;
    });
  }, []);

  const handleHitRing = useCallback((ringIdx: number) => {
    setGameState(prev => {
      if (!prev || prev.gameOver) return prev;
      const nums = RING_NUMBERS[ringIdx];
      const result = hitRing(prev, ringIdx, nums);
      if (result.state.lastAction) setLogMessages(p => [...p, result.state.lastAction!]);
      if (result.state.batch === 2 && prevBatchRef.current === 1) setShowBatchOverlay(true);
      prevBatchRef.current = result.state.batch;
      return result.state;
    });
  }, []);

  const cpuActionBuffer = useRef<string[]>([]);
  const cpuTurnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cpuAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gameStarted && gameState && gameState.isVsCPU && gameState.currentPlayer === 1 && !gameState.gameOver && gameState.dartsRemaining > 0 && !showBatchOverlay) {
      // 6s delay for the first dart of the turn, 2s for others
      const delay = gameState.dartsRemaining === 3 ? 6000 : 2000;

      cpuTurnTimeoutRef.current = setTimeout(() => {
        // We use a functional state update to get the absolute latest state
        setGameState(current => {
          if (!current || current.currentPlayer !== 1 || current.gameOver) return current;

          const move = computeCPUMove(current);
          window.dispatchEvent(new CustomEvent('THROW_DART'));

          // Wait for throw animation (1s) before processing the hit
          cpuAnimationTimeoutRef.current = setTimeout(() => {
            setGameState(prevState => {
              if (!prevState) return null;

              let updated: GameState;
              let summary = '';

              if (move.type === 'number') {
                const result = hitNumber(prevState, move.index);
                updated = result.state;
                summary = `Hit #${move.index}`;
              } else {
                const result = hitRing(prevState, move.index, RING_NUMBERS[move.index]);
                updated = result.state;
                const match = updated.lastAction?.match(/Total: ([\d.]+) pts/);
                summary = `Ring ${move.index + 1} (${RING_NUMBERS[move.index].join(', ')}) [${match ? match[1] : 0} pts]`;
              }

              cpuActionBuffer.current.push(summary);

              if (updated.dartsRemaining === 0 || updated.gameOver) {
                const combinedLog = `[PLAYER B (CPU)]: Turn - ${cpuActionBuffer.current.join(', ')}. [Total: ${updated.players[1].totalScore} pts]`;
                setLogMessages(p => [...p, combinedLog]);
                cpuActionBuffer.current = [];
              }

              if (updated.batch === 2 && prevBatchRef.current === 1) setShowBatchOverlay(true);
              prevBatchRef.current = updated.batch;

              return updated;
            });
          }, 1000);

          return current; // Return current state immediately while animation plays
        });
      }, delay);

      return () => {
        if (cpuTurnTimeoutRef.current) clearTimeout(cpuTurnTimeoutRef.current);
        if (cpuAnimationTimeoutRef.current) clearTimeout(cpuAnimationTimeoutRef.current);
      };
    }
  }, [gameStarted, gameState?.currentPlayer, gameState?.dartsRemaining, gameState?.gameOver, showBatchOverlay]);

  const shareGame = async () => {
    const shareData = {
      title: 'Filling Game Darts',
      text: 'Join me for a strategic game of Filling Game Darts!',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        toast.success("Link copied to clipboard!", {
          description: "Send this to your friend to invite them to play."
        });
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isWaitingForTx, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isTxSuccess) {
      toast.success("Score broadcasted successfully!", {
        description: `Transaction hash: ${hash?.slice(0, 10)}...`
      });
    }
  }, [isTxSuccess, hash]);

  const broadcastScore = async () => {
    if (!gameState || !gameState.gameOver) {
      toast.error("Game is not over yet!");
      return;
    }

    const p1Addr = gameState.players[0].address === '0x0000000000000000000000000000000000000001' && address
      ? address
      : gameState.players[0].address;

    try {
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'submitResult',
        args: [
          BigInt(matchId),
          gameState.winner === 0 ? gameState.players[0].address as `0x${string}` : gameState.players[1].address as `0x${string}`,
          `P1 (${gameState.players[0].name}): ${gameState.players[0].totalScore}, P2 (${gameState.players[1].name}): ${gameState.players[1].totalScore}`
        ],
        account: address as `0x${string}`,
        chain: avalanche,
      });
    } catch (error) {
      console.error("Broadcast failed:", error);
      toast.error("Failed to broadcast score. Check your wallet.");
    }
  };

  if (!gameStarted || !gameState) {
    return (
      <div className={`min-h-screen theme-${theme} transition-colors duration-700 font-sans`}>
        <div className="fixed top-6 left-6 z-50">
          <a
            href="https://fillinggame.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 py-2 px-5 rounded-xl transition-all shadow-[0_0_15px_rgba(232,65,66,0.1)]"
          >
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary font-black uppercase tracking-[0.2em] text-[11px]">Register to Join Tournament</span>
          </a>
        </div>
        <div className="fixed top-6 right-6 z-50 flex gap-3">
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 rounded-xl glass-panel border-white/10 text-white">
            <Settings className="w-6 h-6" />
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md space-y-8 text-center glass-panel p-10 rounded-[2rem] neon-border-theme">
            <h1 className="text-6xl text-white tracking-[0.2em] mb-2">FILLING GAME</h1>
            <p className="text-primary text-sm font-mono-game uppercase tracking-[0.3em] opacity-80">Strategic Dart Simulation</p>
            <div className="space-y-6 pt-4">
              {/* Tab Switcher */}
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                <button
                  onClick={() => setSetupMode('solo')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${setupMode === 'solo' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                >
                  Solo Mission
                </button>
                <button
                  onClick={() => setSetupMode('multi')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${setupMode === 'multi' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                >
                  Private Match
                </button>
              </div>

              {setupMode === 'solo' ? (
                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-black ml-1">Your Name</label>
                  <Input
                    value={p1Name}
                    onChange={(e) => setP1Name(e.target.value)}
                    placeholder="What should we call you?"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/10 h-12 rounded-xl focus:border-primary/50"
                  />
                  <Button onClick={() => isConnected ? setP1Address(address!) : open()} variant="outline" className="w-full h-10 border-white/10 text-white/60 text-xs mt-2 rounded-xl hover:bg-white/5">
                    {p1Address ? `Wallet: ${p1Address.slice(0, 6)}...` : 'Link Your Wallet'}
                  </Button>
                </div>
              ) : !isLobbyJoined ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-black ml-1">Secure Match ID</label>
                    <Input
                      value={matchId}
                      onChange={(e) => setMatchId(e.target.value)}
                      placeholder="Enter the ID provided by your opponent"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/10 h-12 rounded-xl focus:border-primary/50"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!isConnected) {
                        open();
                      } else if (matchId) {
                        setIsLobbyJoined(true);
                      }
                    }}
                    disabled={isConnected && !matchId}
                    className="w-full h-12 bg-primary/20 text-white font-black uppercase tracking-widest text-[10px] rounded-xl border border-primary/30 hover:bg-primary/30 transition-all"
                  >
                    {isConnected ? '📡 Join Private Lobby' : '🔌 Connect Wallet (Passkeys & Smart Wallets Supported)'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Match Lobby: {matchId}</span>
                    <Button variant="ghost" onClick={() => { setIsLobbyJoined(false); setMatchId(''); }} className="h-6 text-[8px] uppercase tracking-widest text-white/30 hover:text-white/60">Change ID</Button>
                  </div>
                  {isLoadingMatch ? (
                    <div className="flex flex-col items-center py-8 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">Verifying Match Data...</span>
                    </div>
                  ) : matchError ? (
                    <div className="py-6 text-center">
                      <XCircle className="w-8 h-8 text-red-500/50 mx-auto mb-2" />
                      <p className="text-[8px] text-red-400/60 mt-2 px-4 italic font-bold">Details: {matchError.message ? matchError.message.slice(0, 150) : 'Unknown Error'}</p>
                      <p className="text-[8px] text-white/30 mt-2 italic">Ensure you are connected to Avalanche C-Chain.</p>
                    </div>
                  ) : isMatchValid ? (
                    <div className="space-y-3">
                      {/* Participant Verification Notice */}
                      {address &&
                        address.toLowerCase() !== (contractMatch as any).player1.toLowerCase() &&
                        address.toLowerCase() !== (contractMatch as any).player2.toLowerCase() && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-2 flex items-center gap-3">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-[10px] text-red-200">Unauthorized: Your wallet is not a participant in this match.</span>
                          </div>
                        )}
                      <div className={`flex items-center justify-between p-3 bg-black/20 rounded-xl border ${((contractMatch as any).player1Paid) ? 'border-primary/40' : 'border-white/5'}`}>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/60 uppercase font-black">{(contractMatch as any).player1Name || 'Commander A'}</span>
                          <span className="text-[8px] text-white/20">{(contractMatch as any).player1.slice(0, 10)}...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(contractMatch as any).player1Paid ? (
                            <>
                              <span className="text-[10px] text-primary font-bold">READY</span>
                              <CheckCircle2 className="w-3 h-3 text-primary" />
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] text-white/30">PENDING</span>
                              <Loader2 className="w-3 h-3 animate-spin text-white/20" />
                            </>
                          )}
                        </div>
                      </div>
                      <div className={`flex items-center justify-between p-3 bg-black/20 rounded-xl border ${((contractMatch as any).player2Paid) ? 'border-primary/40' : 'border-white/5'}`}>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/60 uppercase font-black">{(contractMatch as any).player2Name || 'Commander B'}</span>
                          <span className="text-[8px] text-white/20">{(contractMatch as any).player2.slice(0, 10)}...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(contractMatch as any).player2Paid ? (
                            <>
                              <span className="text-[10px] text-primary font-bold">READY</span>
                              <CheckCircle2 className="w-3 h-3 text-primary" />
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] text-white/30">PENDING</span>
                              <Loader2 className="w-3 h-3 animate-spin text-white/20" />
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-[9px] text-white/40 italic text-center font-medium mt-2">
                        {(contractMatch as any).player1Paid && (contractMatch as any).player2Paid
                          ? "Match details verified. Confirm your entry below."
                          : "Waiting for both commanders to join via fillinggame.vercel.app"}
                      </p>

                      {/* Manual Confirmation Button */}
                      {(contractMatch as any).player1Paid && (contractMatch as any).player2Paid && (
                        <Button
                          onClick={startGame}
                          className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(232,65,66,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 animate-in zoom-in-50 duration-500"
                        >
                          🛸 Confirm & Enter Game
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <XCircle className="w-8 h-8 text-red-500/50 mx-auto mb-2" />
                      <span className="text-[10px] text-white/60 uppercase">Match ID Not Found</span>
                    </div>
                  )}
                </div>
              )}

              {setupMode === 'solo' && (
                <Button onClick={startSoloGame} className="w-full h-14 bg-primary text-white font-black text-xl rounded-xl shadow-[0_0_20px_rgba(232,65,66,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                  🚀 Start Solo Mission
                </Button>
              )}

              <div className="flex justify-center">
                <Button onClick={shareGame} variant="ghost" className="bg-white/5 border border-white/10 text-white/80 font-mono-game uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 px-6 py-2 rounded-lg hover:bg-white/10">
                  <Share2 className="w-3 h-3 text-primary" />
                  Invite Friend
                </Button>
              </div>
              <Button onClick={() => setShowRules(!showRules)} variant="ghost" className="w-full text-white/40 text-[10px] uppercase tracking-widest h-8 mt-2">📜 Game Rules & Strategy</Button>
              {showRules && <RulesScroll />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen theme-${theme} p-3 md:p-6 flex flex-col items-center transition-colors duration-700 font-sans`}>
      <div className="fixed top-6 left-6 z-50">
        <a
          href="https://fillinggame.vercel.app/join-match"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 py-2 px-5 rounded-xl transition-all shadow-[0_0_15px_rgba(232,65,66,0.1)]"
        >
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-primary font-black uppercase tracking-[0.2em] text-[11px]">Register to Join Tournament</span>
        </a>
      </div>
      <div className="fixed top-6 right-6 z-50">
        <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 rounded-xl glass-panel border-white/10 text-white"><Settings className="w-6 h-6" /></Button>
      </div>

      <div className="w-full max-w-[1800px] flex flex-col items-center gap-4 mb-8">
        <h1 className="text-4xl md:text-5xl text-white tracking-[0.25em] text-center">FILLING GAME</h1>
        <div className="flex items-center gap-6 glass-panel py-2 px-6 rounded-full border-white/10">
          <span className="font-mono-game text-[10px] tracking-[0.2em] text-primary animate-pulse uppercase">{gameState.players[gameState.currentPlayer].name}'S TURN</span>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-white/60 text-[10px] font-mono-game tracking-[0.2em] uppercase">{gameState.dartsRemaining} DARTS REMAINING</span>
          {matchId && (
            <>
              <div className="h-4 w-[1px] bg-white/10" />
              <span className="text-primary/60 text-[10px] font-mono-game tracking-[0.2em] uppercase">MATCH ID: {matchId}</span>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={resetGame} className="text-[9px] uppercase tracking-widest text-white/40 hover:text-primary h-6">New Game</Button>
        </div>
      </div>

      {gameState.gameOver && gameState.winner !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-panel p-12 rounded-[2rem] border-primary text-center neon-border-theme">
            <h2 className="text-6xl text-primary font-black italic mb-4 uppercase">{gameState.players[gameState.winner].name} WINS!</h2>
            <p className="text-white/60 font-mono-game uppercase tracking-widest mb-6">Final Score: {gameState.players[gameState.winner].totalScore} pts</p>

            {gameState.batch1Scores && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 animate-in slide-in-from-top-4 duration-700 delay-300">
                <div className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-3">Batch 1 Intelligence Report</div>
                <div className="flex items-center justify-center gap-12">
                  <div className="text-left">
                    <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">{gameState.players[0].name}</div>
                    <div className={`text-2xl font-black italic ${gameState.batch1Scores[0] > gameState.batch1Scores[1] ? 'text-primary' : 'text-white/60'}`}>
                      {gameState.batch1Scores[0]} pts
                    </div>
                  </div>
                  <div className="text-primary font-black italic">VS</div>
                  <div className="text-right">
                    <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">{gameState.players[1].name}</div>
                    <div className={`text-2xl font-black italic ${gameState.batch1Scores[1] > gameState.batch1Scores[0] ? 'text-primary' : 'text-white/60'}`}>
                      {gameState.batch1Scores[1]} pts
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-white/40 font-mono-game uppercase tracking-widest italic">
                  {gameState.batch1Scores[0] > gameState.batch1Scores[1]
                    ? `${gameState.players[0].name} dominated the first engagement`
                    : gameState.batch1Scores[1] > gameState.batch1Scores[0]
                      ? `${gameState.players[1].name} led the initial charge`
                      : "An equal exchange of firepower in Batch 1"
                  }
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">Tactical Progress</div>
                <div className="text-xl font-black italic text-primary">{gameState.closedNumbers.size} / 15</div>
                <div className="text-[7px] text-white/20 uppercase tracking-tighter">Numbers Closed</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">Match Success Rate</div>
                <div className="text-xl font-black italic text-primary">
                  {Math.round((gameState.players[gameState.winner!].totalScore / (15 * 12 + 10)) * 100)}%
                </div>
                <div className="text-[7px] text-white/20 uppercase tracking-tighter">Combat Efficiency</div>
              </div>
            </div>

            <div className="space-y-6 mb-10">
              <div className="flex flex-col items-center gap-2">
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Broadcast Victory To Command</div>
                <div className="text-[9px] text-primary/60 italic">📸 Tip: Take a screenshot to share with your tactical report!</div>
                <div className="text-[10px] text-white/40 font-mono-game mt-2 font-bold tracking-widest opacity-50 underline decoration-primary/30">https://fillgamedart.vercel.app</div>
              </div>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => {
                    const siteUrl = "https://fillgamedart.vercel.app";
                    const text = `🎯 Tactical Victory on Filling Game! \n🏆 Score: ${gameState.players[gameState.winner!].totalScore} pts\n📊 Batch 1: ${gameState.batch1Scores![0]} - ${gameState.batch1Scores![1]}\n🚀 Play now: ${siteUrl}`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  variant="outline" className="w-12 h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-primary p-0 shadow-lg"
                >
                  <Twitter className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => {
                    const siteUrl = "https://fillgamedart.vercel.app";
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`, '_blank');
                  }}
                  variant="outline" className="w-12 h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-blue-500 p-0 shadow-lg"
                >
                  <Facebook className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => {
                    const siteUrl = "https://fillgamedart.vercel.app";
                    const text = `🎯 Tactical Victory! Score: ${gameState.players[gameState.winner!].totalScore} pts. \nBatch 1 Breakdown: ${gameState.batch1Scores![0]} vs ${gameState.batch1Scores![1]}. \nJoin the fight at ${siteUrl}`;
                    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  variant="outline" className="w-12 h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-purple-500 p-0 shadow-lg"
                >
                  <Send className="w-5 h-5" /> {/* Using Send for Farcaster/Warpcast feel */}
                </Button>
                <Button
                  onClick={() => {
                    const siteUrl = "https://fillgamedart.vercel.app";
                    const summary = `🏆 I won! ${gameState.players[gameState.winner!].totalScore} pts on Filling Game. (B1: ${gameState.batch1Scores![0]}-${gameState.batch1Scores![1]}). \nPlay: ${siteUrl}`;
                    navigator.clipboard.writeText(summary);
                    toast.success("Score details copied! Share your screenshot on Instagram.");
                  }}
                  variant="outline" className="w-12 h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-pink-500 p-0 shadow-lg"
                >
                  <Instagram className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={resetGame} className="bg-white/10 text-white font-black px-8 py-6 text-lg rounded-xl flex-1 hover:bg-white/20">Play Again</Button>
              <Button onClick={broadcastScore} disabled={!isConnected} className="bg-primary text-white font-black px-8 py-6 text-lg rounded-xl flex-1 shadow-[0_0_20px_rgba(232,65,66,0.3)]">
                {isWaitingForTx ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wallet className="w-5 h-5 mr-2" />}
                Broadcast Score
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1700px] flex flex-col xl:flex-row gap-6 items-stretch justify-center min-h-0 pb-10">
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

          {/* Target Score Display */}
          <div className="mt-4 glass-panel rounded-3xl p-5 border-white/10 shadow-2xl animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/40">Target Score</span>
              <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${gameState.batch === 1 ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                Batch {gameState.batch}
              </div>
            </div>
            {gameState.batch === 2 && gameState.batch1Scores && (
              <div className="grid grid-cols-2 gap-4 mt-1 mb-4">
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <div className="text-[8px] font-black text-white/30 uppercase tracking-widest">{gameState.players[0].name} B1</div>
                  <div className="text-sm font-bold text-white italic">{gameState.batch1Scores[0]} pts</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <div className="text-[8px] font-black text-white/30 uppercase tracking-widest">{gameState.players[1].name} B1</div>
                  <div className="text-sm font-bold text-white italic">{gameState.batch1Scores[1]} pts</div>
                </div>
              </div>
            )}
            {gameState.batch === 1 && (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-tighter italic">221.5</span>
                <span className="text-[10px] font-mono-game text-white/20 uppercase tracking-widest">points</span>
              </div>
            )}
            {gameState.batch === 2 && gameState.batch1Scores && (
              <div className="mt-1 space-y-1.5 border-t border-white/5 pt-3">
                <div className="text-[9px] font-medium leading-tight text-primary/80">
                  <span className="font-black">NOTE:</span> {gameState.players[0].name} needs <span className="underline">{gameState.batch1Scores[1]} pts</span> to win Batch 2
                </div>
                <div className="text-[9px] font-medium leading-tight text-secondary/80">
                  <span className="font-black">NOTE:</span> {gameState.players[1].name} needs <span className="underline">{gameState.batch1Scores[0]} pts</span> to win Batch 2
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Board */}
        <div className="flex-1 flex flex-col items-center justify-between min-w-0 order-1 xl:order-2 py-4">
          <div className="flex-1 flex items-center justify-center">
            <Dartboard gameState={gameState} onHitNumber={handleHitNumber} onHitRing={handleHitRing} disabled={gameState.gameOver} />
          </div>
          <div className="flex flex-col items-center gap-6 w-full max-w-md mt-6 h-48">
            <DartArrow
              boardPhase={gameState.dartsRemaining > 0 ? 'idle' : 'throwing'}
              isFlying={isDartFlying}
              isVisible={!gameState.gameOver}
              disabled={gameState.gameOver || gameState.currentPlayer === 1}
              onClick={() => window.dispatchEvent(new CustomEvent('THROW_DART'))}
              playerIdx={gameState.currentPlayer}
            />
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

      <BatchTransitionOverlay
        show={showBatchOverlay}
        scores={gameState.batch1Scores}
        players={gameState.players}
        onClose={() => setShowBatchOverlay(false)}
      />

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} theme={theme} onThemeChange={setTheme} volume={volume} onVolumeChange={setVolume} musicEnabled={musicEnabled} onMusicToggle={setMusicEnabled} sfxEnabled={sfxEnabled} onSfxToggle={setSfxEnabled} selectedMusic={selectedMusic} onMusicChange={setSelectedMusic} />
    </div>
  );
};

const BatchTransitionOverlay = ({ show, scores, players, onClose }: any) => {
  if (!show || !scores) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="max-w-2xl w-full glass-panel p-12 rounded-[3rem] border-2 border-primary text-center space-y-8 animate-in zoom-in slide-in-from-bottom-12">
        <h2 className="text-5xl font-black italic text-primary text-glow-theme leading-tight">BATCH 1 COMPLETE!</h2>

        <div className="grid grid-cols-2 gap-6 pt-4">
          <div className="glass-panel p-6 border-white/5 bg-white/5 rounded-2xl">
            <div className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase">{players[0].name}</div>
            <div className="text-3xl font-black text-white italic">{scores[0]} pts</div>
          </div>
          <div className="glass-panel p-6 border-white/5 bg-white/5 rounded-2xl">
            <div className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase">{players[1].name}</div>
            <div className="text-3xl font-black text-white italic">{scores[1]} pts</div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h3 className="text-primary font-black uppercase tracking-[0.2em] text-sm">Batch 2: The Race to Beat the Bar</h3>
          <div className="glass-panel p-8 bg-black/40 rounded-[2rem] text-left border-white/10 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">🎯</div>
              <p className="text-white/90 text-[13px] leading-relaxed">
                <strong>{players[0].name}</strong> needs to surpass <strong>{scores[1]} pts</strong> ({players[1].name}'s score) to win.
              </p>
            </div>
            <div className="h-[1px] bg-white/5 w-full" />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">🏁</div>
              <p className="text-white/90 text-[13px] leading-relaxed">
                <strong>{players[1].name}</strong> needs to surpass <strong>{scores[0]} pts</strong> ({players[0].name}'s score) to win.
              </p>
            </div>
          </div>
        </div>

        <Button onClick={onClose} className="bg-primary hover:bg-primary/80 text-white font-black px-12 py-8 text-2xl rounded-2xl shadow-xl w-full mt-4 transform hover:scale-105 transition-all">START BATCH 2 RACE 🏹</Button>
      </div>
    </div>
  );
};

export default Index;
