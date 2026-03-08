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
import { Palette, Settings, Volume2, Music as MusicIcon, Wallet, CheckCircle2, XCircle, Share2, Loader2, Twitter, Facebook, Instagram, Send, Eye } from 'lucide-react';
import SettingsDialog, { CustomTrack } from '../components/SettingsDialog';
import BackgroundLayer, { BackgroundMode } from '../components/BackgroundLayer';
import { useAccount, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { encodeFunctionData, parseEther, stringToHex } from 'viem';
import { avalanche } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI, VERIFIER_CONTRACT_ADDRESS, VERIFIER_CONTRACT_ABI, CHAINLINK_SUBSCRIPTION_ID } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

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
  <div className="mt-2 text-left glass-panel p-6 rounded-2xl border-white/10 bg-black/40 space-y-5 max-h-72 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-4 duration-500">
    <h3 className="text-primary font-mono-game tracking-[0.3em] uppercase text-xs font-black border-b border-white/10 pb-3 flex items-center justify-between">
      📖 How To Play
      <span className="text-[9px] text-white/30 animate-pulse">Scroll to read more</span>
    </h3>
    <div className="text-white/80 text-[11px] space-y-5 font-medium leading-relaxed">

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🎯 The Goal
        </h4>
        <p className="pl-4 border-l border-white/10">
          Score as many points as you can by throwing darts at numbers on the board. Numbers go from <strong>1 to 14</strong>. The player with the highest score wins.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🏹 Taking Your Turn
        </h4>
        <p className="pl-4 border-l border-white/10">
          Each player throws <strong>3 darts</strong> per turn. Player A throws 3 darts, then Player B throws 3 darts, and so on.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          💰 Filler Points (+2 each hit)
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-1">
          <p>Every time you hit a number, you earn <span className="text-secondary font-bold">+2 points</span>. Simple as that!</p>
          <p className="text-white/50 italic">Example: Hit number 7 three times → earn 6 points.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          📊 Closing a Number
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-1">
          <p>Each number needs to be hit a certain number of times <strong>in total by BOTH players</strong> before it "closes." The required total equals the number itself.</p>
          <p className="text-white/50 italic">Example: Number <strong>4</strong> needs 4 total hits (between both players). Number <strong>10</strong> needs 10 total hits.</p>
          <p>Once a number closes, no more points can be earned from it.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🔥 Top Filler Bonus (+7 or +3.5)
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-1">
          <p>Once more than half the hits needed for a number have been made, the player who is <strong>leading</strong> in hits on that number gets a <span className="text-secondary font-bold">+7 bonus</span> on top of the usual +2.</p>
          <p>If both players have the <strong>same number of hits</strong> on a number, they <strong>split the bonus</strong> — each gets <span className="text-secondary font-bold">+3.5 points</span>.</p>
          <p className="text-white/50 italic">Example: For number 6, once 4+ total hits exist, the player with more hits gets +7. If tied, both get +3.5.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          ⚡ Fill-Up Bonus (+10)
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-1">
          <p>Whoever lands the <strong>final dart</strong> that closes a number earns a big <span className="text-primary font-bold">+10 bonus</span>!</p>
          <p className="text-white/50 italic">Example: Number 5 needs 5 total hits. The player who throws the 5th hit gets +2 (filler) + +10 (fill-up) = 12 points from that single dart.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          ⭕ Special: Hit a Ring
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-1">
          <p>The board has <strong>4 rings</strong> (circles). Each ring contains multiple numbers. When you hit a ring, your dart counts as a hit on <strong>ALL numbers in that ring at once!</strong></p>
          <p className="text-white/50 italic">Example: Ring 3 contains numbers 11, 1, 3, and 8. One dart hit = one hit on all four numbers simultaneously!</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🌟 Number 1 is Special!
        </h4>
        <p className="pl-4 border-l border-white/10">
          Number 1 closes. First single hit on it gives you <span className="text-secondary font-bold">+2 Filler</span> and <span className="text-primary font-bold">+10 Fill-Up</span> = <strong>12 points instantly.</strong>
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          🏆 The Two-Batch System
        </h4>
        <div className="pl-4 border-l border-white/10 space-y-2">
          <p><strong>Batch 1:</strong> Play until someone reaches <strong>221.5 points</strong>. Both players' scores are saved.</p>
          <p><strong>Batch 2 (The Comeback Round!):</strong> Now each player's target becomes their <em>opponent's</em> Batch 1 score. The first player to beat it wins the whole game!</p>
          <p className="text-secondary font-bold italic">Anyone can win in Batch 2 — even if you were behind in Batch 1!</p>
        </div>
      </section>

    </div>
  </div>
);


const Index = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'neon' | 'avalanche' | 'gold' | 'midnight'>('neon');
  const [gameStarted, setGameStarted] = useState(false);
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [p1Address, setP1Address] = useState<string | null>(null);
  const [p2Address, setP2Address] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState<'solo' | 'multi' | 'invite'>('solo');
  const [isVsCPU, setIsVsCPU] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchId, setMatchId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isLobbyJoined, setIsLobbyJoined] = useState(false);
  const [showBatchOverlay, setShowBatchOverlay] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [selectedMusic, setSelectedMusic] = useState('synth_wave');
  const [isDartFlying, setIsDartFlying] = useState(false);
  const [makePublic, setMakePublic] = useState(false);
  const [customTracks, setCustomTracks] = useState<CustomTrack[]>([]);
  const [background, setBackground] = useState<BackgroundMode>('sky');
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | undefined>(undefined);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hitHistory, setHitHistory] = useState<any[]>([]);


  const handleCustomTrackAdd = (track: CustomTrack) => {
    setCustomTracks(prev => [...prev, track]);
  };

  const handleCustomTrackDelete = (index: number) => {
    setCustomTracks(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

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
  const [supabaseConnected, setSupabaseConnected] = useState(false);

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

  // Game State Sync from Hash
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#sync=')) {
        try {
          const encodedData = hash.substring(6);
          const decodedData = decodeURIComponent(atob(encodedData));
          const state = JSON.parse(decodedData);

          // Rehydrate Set for closedNumbers
          if (state.closedNumbers) {
            state.closedNumbers = new Set(state.closedNumbers);
          }

          setGameState(state);
          setGameStarted(true);
          toast.success("Game state synchronized!");
          window.location.hash = "";
        } catch (e) {
          console.error("Sync Error:", e);
          toast.error("Failed to sync game state.");
        }
      } else if (hash.startsWith('#invite=')) {
        const code = hash.substring(8);
        setSetupMode('invite');
        setInviteCode(code);
        setIsHost(false);
        setIsLobbyJoined(true);
        toast.info("Joining invite match...");
        // Keep hash so we know it's an invite link until game starts
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    handleHashSync(); // Check on mount
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);

  // Verify match existence (ID should be non-zero)
  const isMatchValid = contractMatch && (contractMatch as any).id !== 0n;

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const prevBatchRef = useRef<number>(1);

  // Manual start only
  const startGame = () => {
    if (!contractMatch) return;

    const m = contractMatch as any;
    setIsVsCPU(false);
    const initialState = createInitialGameState(
      m.player1Name || 'Player 1',
      m.player1,
      m.player2Name || 'Player 2',
      m.player2,
      false
    );
    setGameState(initialState);
    setGameStarted(true);

    // Initialize Supabase row
    broadcastGameState(initialState);
  };

  // Game State Sync from Supabase
  useEffect(() => {
    const activeMatchId = setupMode === 'invite' ? inviteCode : String(parsedMatchId || '');
    if (!activeMatchId || (setupMode !== 'multi' && setupMode !== 'invite')) return;

    // 1. Fetch current state if it exists
    const fetchCurrentState = async () => {
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('game_state, lobby_host, lobby_guest')
          .eq('match_id', activeMatchId)
          .single();
        if (data) {
          if (data.game_state) {
            const newState = data.game_state;
            if (newState.closedNumbers) {
              newState.closedNumbers = new Set(newState.closedNumbers);
            }
            if (!newState.logMessages) {
              newState.logMessages = [];
            }
            setGameState(newState);
            setGameStarted(true);
          }

          if (data.lobby_host && !isHost) {
            try {
              const host = typeof data.lobby_host === 'string' ? JSON.parse(data.lobby_host) : data.lobby_host;
              if (host.name) setP1Name(host.name);
              if (host.address) setP1Address(host.address);
            } catch (e) { console.error("Parse host error:", e); }
          }
          if (data.lobby_guest) {
            try {
              const guest = typeof data.lobby_guest === 'string' ? JSON.parse(data.lobby_guest) : data.lobby_guest;
              if (guest.name) setP2Name(guest.name);
              if (guest.address) setP2Address(guest.address);
            } catch (e) { console.error("Parse guest error:", e); }
          }
        }
      } catch (e) {
        console.error("Initial fetch failed:", e);
      }
    };

    fetchCurrentState();

    // 2. Subscribe to new changes
    const channel = supabase
      .channel(`match-${activeMatchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `match_id=eq.${activeMatchId}` },
        (payload) => {
          const row = payload.new as any;
          const newState = row.game_state;
          if (newState) {
            // Rehydrate Set for closedNumbers
            if (newState.closedNumbers) {
              newState.closedNumbers = new Set(newState.closedNumbers);
            }
            if (!newState.logMessages) {
              newState.logMessages = [];
            }
            setGameState(newState);
            setGameStarted(true);
          }

          // Also sync lobby names if not already set (especially for guest joining)
          if (row.lobby_host && !isHost) {
            try {
              const host = typeof row.lobby_host === 'string' ? JSON.parse(row.lobby_host) : row.lobby_host;
              if (host.name && !p1Name) setP1Name(host.name);
              if (host.address && !p1Address) setP1Address(host.address);
            } catch (e) { }
          }
          if (row.lobby_guest) {
            try {
              const guest = typeof row.lobby_guest === 'string' ? JSON.parse(row.lobby_guest) : row.lobby_guest;
              if (guest.name && !p2Name) setP2Name(guest.name);
              if (guest.address && !p2Address) setP2Address(guest.address);
            } catch (e) { }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSupabaseConnected(true);
        } else {
          setSupabaseConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setupMode, parsedMatchId, inviteCode]);

  const broadcastGameState = useCallback(async (state: GameState) => {
    const activeMatchId = setupMode === 'invite' ? inviteCode : String(parsedMatchId || '');
    if (!activeMatchId || (setupMode !== 'multi' && setupMode !== 'invite') || isVsCPU) return;

    // If game just ended in an invite match, release the featured spectator slot
    if (state.gameOver && setupMode === 'invite' && inviteCode) {
      try {
        await supabase.from('matches').update({ status: 'finished' }).eq('match_id', inviteCode);
      } catch { /* non-critical */ }
    }

    try {
      const serializedState = {
        ...state,
        theme, // Sync the current theme
        latestDart: state.latestDart || null,
        closedNumbers: Array.from(state.closedNumbers)
      };

      // Use update instead of upsert to preserve other columns like lobby info and featured status
      const { error } = await supabase
        .from('matches')
        .update({
          game_state: serializedState,
          updated_at: new Date().toISOString() // Force updated_at update
        })
        .eq('match_id', activeMatchId);

      if (error) {
        console.error("Broadcast error:", error);
      }
    } catch (e) {
      console.error("Sync broadcast failed:", e);
    }
  }, [setupMode, parsedMatchId, inviteCode, isVsCPU, theme]);

  // Heartbeat to keep live match active in spectator list
  useEffect(() => {
    const activeMatchId = setupMode === 'invite' ? inviteCode : String(parsedMatchId || '');
    if (!gameStarted || !isHost || !activeMatchId || setupMode === 'solo') return;

    const interval = setInterval(async () => {
      // Just "touch" the row to update updated_at. 
      // Using 'status' as a safe field to overwrite with same value.
      try {
        await supabase
          .from('matches')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('match_id', activeMatchId);
      } catch (e) {
        console.error("Heartbeat failed:", e);
      }
    }, 45000); // Every 45 seconds

    return () => {
      clearInterval(interval);
      // Optional: on unmount (refresh/leave), try to mark as inactive if match is over or host left
      // Note: this might not always complete on tab close, but helps on navigation
      if (isHost && activeMatchId) {
        supabase.from('matches').update({ status: 'finished' }).eq('match_id', activeMatchId).then();
      }
    };
  }, [gameStarted, isHost, setupMode, inviteCode, parsedMatchId]);

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
      // Resolve the audio source — custom tracks use blob URLs, built-ins use file paths
      let src: string | undefined;
      if (selectedMusic.startsWith('custom_')) {
        const idx = parseInt(selectedMusic.split('_')[1], 10);
        src = customTracks[idx]?.url;
      } else {
        src = (AUDIO_ASSETS.music as any)[selectedMusic];
      }

      if (!src) return; // track was deleted or not found

      if (!musicRef.current) {
        musicRef.current = new Audio(src);
        musicRef.current.loop = true;
      } else {
        musicRef.current.src = src;
      }
      musicRef.current.volume = volume * 0.4;
      musicRef.current.play().catch(e => console.warn("Music play delayed", e));
    } else {
      if (musicRef.current) musicRef.current.pause();
    }
  }, [musicEnabled, gameStarted, selectedMusic, volume, customTracks]);

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
    const initialState = createInitialGameState(player1Name, player1Address, 'Computer AI (CPU)', '0x0000000000000000000000000000000000000000', true);
    setGameState(initialState);
    setGameStarted(true);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameState(null);
    setShowBatchOverlay(false);
    prevBatchRef.current = 1;
  };

  const handleHitNumber = useCallback((num: number, dartPos?: { x: number; y: number; angle: number; tilt: number }) => {
    if (!gameState || gameState.gameOver) return;

    const result = hitNumber(gameState, num);
    const updatedState = result.state;

    // Apply visual sync state
    updatedState.theme = theme;
    if (dartPos) {
      updatedState.latestDart = { ...dartPos, playerIdx: gameState.currentPlayer };
    }
    if (updatedState.gameOver) {
      updatedState.latestDart = null;
    }

    if (updatedState.batch === 2 && prevBatchRef.current === 1) setShowBatchOverlay(true);
    prevBatchRef.current = updatedState.batch;

    setGameState(updatedState);
    setHitHistory(prev => [...prev, { player: gameState.currentPlayer, value: num, type: 'number' }]);
    broadcastGameState(updatedState);
  }, [gameState, broadcastGameState, theme]);

  const handleHitRing = useCallback((ringIdx: number, dartPos?: { x: number; y: number; angle: number; tilt: number }) => {
    if (!gameState || gameState.gameOver) return;

    const nums = RING_NUMBERS[ringIdx];
    const result = hitRing(gameState, ringIdx, nums);
    const updatedState = result.state;

    // Apply visual sync state
    updatedState.theme = theme;
    if (dartPos) {
      updatedState.latestDart = { ...dartPos, playerIdx: gameState.currentPlayer };
    }
    if (updatedState.gameOver) {
      updatedState.latestDart = null;
    }

    if (updatedState.batch === 2 && prevBatchRef.current === 1) setShowBatchOverlay(true);
    prevBatchRef.current = updatedState.batch;

    setGameState(updatedState);
    setHitHistory(prev => [...prev, { player: gameState.currentPlayer, value: ringIdx, type: 'ring' }]);
    broadcastGameState(updatedState);
  }, [gameState, broadcastGameState, theme]);

  const cpuActionBuffer = useRef<string[]>([]);
  const cpuTurnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cpuAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // CPU Turn Logic
    if (
      gameStarted &&
      gameState &&
      gameState.isVsCPU &&
      gameState.currentPlayer === 1 &&
      !gameState.gameOver &&
      gameState.dartsRemaining > 0 &&
      !showBatchOverlay &&
      !isDartFlying
    ) {
      // 6s delay for the first dart of the turn, 2s for others
      const delay = gameState.dartsRemaining === 3 ? 6000 : 2000;

      cpuTurnTimeoutRef.current = setTimeout(() => {
        // Use the current state to compute the move
        const move = computeCPUMove(gameState);

        // Trigger visual throw
        window.dispatchEvent(new CustomEvent('THROW_DART'));

        // Wait for throw animation (1s) before processing the logic hit
        cpuAnimationTimeoutRef.current = setTimeout(() => {
          setGameState(prevState => {
            if (!prevState || prevState.currentPlayer !== 1 || prevState.gameOver) return prevState;

            let updated: GameState;
            if (move.type === 'number') {
              const result = hitNumber(prevState, move.index);
              updated = result.state;
            } else {
              const result = hitRing(prevState, move.index, RING_NUMBERS[move.index]);
              updated = result.state;
            }

            if (updated.batch === 2 && prevBatchRef.current === 1) setShowBatchOverlay(true);
            prevBatchRef.current = updated.batch;

            setHitHistory(prev => [...prev, { player: 1, value: move.index, type: move.type }]);
            return updated;
          });
        }, 1000);
      }, delay);
    }

    return () => {
      if (cpuTurnTimeoutRef.current) clearTimeout(cpuTurnTimeoutRef.current);
      if (cpuAnimationTimeoutRef.current) clearTimeout(cpuAnimationTimeoutRef.current);
    };
  }, [gameStarted, gameState, showBatchOverlay, isDartFlying]);

  const canIThrow = (() => {
    if (!gameState || gameState.gameOver || gameState.dartsRemaining <= 0 || showBatchOverlay) return false;
    if (isDartFlying) return false;

    // Solo vs CPU: Only Player 0 (human) can throw when it's their turn
    if (gameState.isVsCPU) {
      return gameState.currentPlayer === 0;
    }

    // Multiplayer (Invite or Private): 
    // Compare current player's address with the connected wallet address.
    const myAddr = address?.toLowerCase();
    const activePlayerAddr = gameState.players[gameState.currentPlayer].address?.toLowerCase();

    // Safety: if address is missing, we can't throw
    if (!myAddr || !activePlayerAddr) return false;

    return myAddr === activePlayerAddr;
  })();

  const createInviteMatch = async () => {
    if (!isConnected || !address || !p1Name) {
      toast.error("Please connect wallet and enter your name first!");
      return;
    }
    const newCode = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    setInviteCode(newCode);
    setIsHost(true);
    setIsLobbyJoined(true);
    setP1Address(address);

    // If makePublic is checked, mark as featured so it shows in spectator lobby
    const isFeatured = makePublic;

    // Write host lobby row to Supabase so the subscription channel is ready
    try {
      const { error } = await supabase.from('matches').upsert({
        match_id: newCode,
        lobby_host: { name: p1Name, address },
        lobby_guest: null,
        game_state: null,
        is_featured: isFeatured,
        status: 'active',
      }, { onConflict: 'match_id' });

      if (error) {
        console.error('Failed to create lobby row:', error);
        toast.error("Supabase Error: " + error.message);
        return;
      }
    } catch (e) {
      console.error('Failed to create lobby row:', e);
      toast.error("Connection failed. Check your Supabase setup.");
      return;
    }

    const inviteLink = `${window.location.origin}${window.location.pathname}#invite=${newCode}`;
    await navigator.clipboard.writeText(inviteLink);
    toast.success(isFeatured ? "Invite Link Copied! Match is PUBLIC — spectators can watch live." : "Invite Link Copied!", {
      description: "Send this to your opponent."
    });
  };

  const joinInviteMatch = async () => {
    if (!isConnected || !address || !p2Name) {
      toast.error("Please connect wallet and enter your name to join!");
      return;
    }
    setP2Address(address);
    // Write guest presence directly to Supabase so Host detects it
    try {
      const { error } = await supabase.from('matches')
        .update({
          lobby_guest: { name: p2Name, address },
        })
        .eq('match_id', inviteCode);

      if (error) {
        console.error('Failed to write guest presence:', error);
        toast.error("Join failed: " + error.message);
      } else {
        toast.success("Joined match lobby. Waiting for Host to start.");
      }
    } catch (e) {
      console.error('Failed to write guest presence:', e);
      toast.error("Connection failed.");
    }
  };

  // Host: watch Supabase for guest joining
  useEffect(() => {
    if (!isHost || !inviteCode) return;

    const channel = supabase
      .channel(`invite-lobby-${inviteCode}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `match_id=eq.${inviteCode}` },
        (payload) => {
          const row = payload.new as any;
          if (row.lobby_guest) {
            try {
              const guest = typeof row.lobby_guest === 'string'
                ? JSON.parse(row.lobby_guest)
                : row.lobby_guest;
              if (guest.name && guest.address) {
                setP2Name(guest.name);
                setP2Address(guest.address);
                toast.success(`${guest.name} has joined the lobby!`);
              }
            } catch (e) {
              console.error('Failed to parse guest info:', e);
            }
          }
          // If host broadcasts a game_state (game started), guest sync handles the rest
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isHost, inviteCode]);

  const startInviteMatch = () => {
    if (!isHost || !inviteCode || !p2Name || !p2Address) {
      toast.error("Waiting for opponent to connect...");
      return;
    }

    setIsVsCPU(false);
    const initialState = createInitialGameState(
      p1Name,
      p1Address || address || '0x',
      p2Name,
      p2Address,
      false
    );
    setGameState(initialState);
    setGameStarted(true);

    // Broadcast the official start
    broadcastGameState(initialState);
  };

  const getLauncherText = () => {
    if (!gameState) return '';
    if (gameState.gameOver) return 'Game Over';
    if (showBatchOverlay) return 'Next Batch...';
    if (gameState.dartsRemaining <= 0) return 'Turn Ending...';

    if (gameState.isVsCPU && gameState.currentPlayer === 1) {
      return 'CPU Throwing...';
    }

    if (canIThrow) return 'Launch Dart';
    return (gameState.isVsCPU && gameState.currentPlayer === 0) || (address && gameState.players[gameState.currentPlayer].address.toLowerCase() === address.toLowerCase())
      ? 'Launch Dart'
      : 'Wait Turn';
  };

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

  const shareSyncLink = async () => {
    if (!gameState) return;

    try {
      // Serialize state (Set needs to be array)
      const serializedState = {
        ...gameState,
        closedNumbers: Array.from(gameState.closedNumbers)
      };

      const encoded = btoa(encodeURIComponent(JSON.stringify(serializedState)));
      const syncUrl = `${window.location.origin}${window.location.pathname}#sync=${encoded}`;

      await navigator.clipboard.writeText(syncUrl);
      toast.success("Sync Share Link Copied!", {
        description: "Send this to the other player to sync your turns."
      });
    } catch (err) {
      console.error('Error sharing sync link:', err);
      toast.error("Failed to generate sync link.");
    }
  };

  const { writeContract, data: hash, isPending: isBroadcasting } = useWriteContract();
  const { isLoading: isWaitingForTx, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isTxSuccess) {
      toast.success("Score broadcasted successfully!", {
        description: `Transaction hash: ${hash?.slice(0, 10)}...`
      });
    }
  }, [isTxSuccess, hash]);

  const broadcastScore = async () => {
    if (!gameState || !gameState.gameOver || gameState.winner === null) {
      toast.error("Game is not over yet!");
      return;
    }

    // Restrict broadcasting to the winner only
    const winnerAddr = gameState.players[gameState.winner].address;
    // For solo games with guest address
    const actualWinnerAddr = winnerAddr === '0x0000000000000000000000000000000000000001' && address
      ? address
      : winnerAddr;

    if (!address || address.toLowerCase() !== actualWinnerAddr.toLowerCase()) {
      toast.error("Only the winner can broadcast the score!");
      return;
    }

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

  const renderSetupContent = () => {
    if (setupMode === 'solo') {
      return (
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
      );
    }

    if (setupMode === 'multi') {
      if (!isLobbyJoined) {
        return (
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
        );
      }

      return (
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
      );
    }

    if (setupMode === 'invite') {
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-1 text-left">
            <label className="text-[10px] uppercase tracking-widest text-white/30 font-black ml-1">Your Name</label>
            <Input
              value={(!isLobbyJoined || isHost) ? p1Name : p2Name}
              onChange={(e) => (!isLobbyJoined || isHost) ? setP1Name(e.target.value) : setP2Name(e.target.value)}
              placeholder="Enter your name"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/10 h-10 rounded-xl focus:border-primary/50 text-sm mb-2"
            />
            <Button onClick={() => isConnected ? setP1Address(address!) : open()} variant="outline" className="w-full h-10 border-white/10 text-white/60 text-xs mb-4 rounded-xl hover:bg-white/5">
              {address ? `Wallet: ${address.slice(0, 6)}...` : 'Link Your Wallet First'}
            </Button>
          </div>

          {!isLobbyJoined ? (
            <>
              {/* Public Spectator Toggle */}
              <div
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 mb-2 cursor-pointer select-none"
                onClick={() => setMakePublic(v => !v)}
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Allow Spectators</span>
                  <span className="text-[9px] text-white/30 mt-0.5">Make this a public live match (max 3 slots)</span>
                </div>
                <div className={`w-10 h-5 rounded-full transition-all relative ${makePublic ? 'bg-primary' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${makePublic ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>
              <Button
                onClick={createInviteMatch}
                disabled={!isConnected || !p1Name}
                className="w-full h-12 bg-primary/20 text-white font-black uppercase tracking-widest text-[10px] rounded-xl border border-primary/30 hover:bg-primary/30 transition-all"
              >
                {isConnected ? '🔗 Create Invite Link' : '🔌 Connect Wallet to Host'}
              </Button>
            </>
          ) : (
            <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Room: {inviteCode}</span>
                {isHost ? (
                  <Button variant="ghost" onClick={() => {
                    const link = `${window.location.origin}${window.location.pathname}#invite=${inviteCode}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Link copied!");
                  }} className="h-6 text-[8px] uppercase tracking-widest text-white/30 hover:text-white/60">Copy Link</Button>
                ) : (
                  <Button variant="ghost" onClick={() => { setIsLobbyJoined(false); setInviteCode(''); window.location.hash = ""; }} className="h-6 text-[8px] uppercase tracking-widest text-white/30 hover:text-white/60">Leave</Button>
                )}
              </div>

              <div className="space-y-3">
                {/* Host Box */}
                <div className={`flex items-center justify-between p-3 bg-black/20 rounded-xl border border-primary/40`}>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/60 uppercase font-black">{p1Name || 'Host'}</span>
                    <span className="text-[8px] text-white/20">{p1Address?.slice(0, 10) || 'Waiting...'}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-primary font-bold">HOST</span>
                  </div>
                </div>

                {/* Guest Box */}
                <div className={`flex items-center justify-between p-3 bg-black/20 rounded-xl border ${p2Name || p2Address ? 'border-primary/40' : 'border-white/5'}`}>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-white/60 uppercase font-black">
                      {p2Name || 'Waiting for friend...'}
                    </span>
                    <span className="text-[8px] text-white/20">
                      {p2Address ? p2Address.slice(0, 10) : 'Waiting...'}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p2Name && p2Address ? (
                      <>
                        <span className="text-[10px] text-primary font-bold">JOINED</span>
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
              </div>

              {isHost ? (
                <Button
                  onClick={startInviteMatch}
                  disabled={!p2Name || !p2Address}
                  className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(232,65,66,0.3)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all mt-4"
                >
                  {p2Name ? `🛸 Start Match vs ${p2Name}` : '⏳ Waiting for Friend...'}
                </Button>
              ) : (
                <Button
                  onClick={joinInviteMatch}
                  disabled={!isConnected || !p2Name}
                  className="w-full h-12 bg-primary/20 text-white font-black uppercase tracking-widest text-xs border border-primary/30 rounded-xl hover:bg-primary/30 transition-all mt-4"
                >
                  Join & Ready Up
                </Button>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (!gameStarted || !gameState) {
    return (
      <div className={`min-h-screen theme-${theme} transition-colors duration-700 font-sans`}>
        <BackgroundLayer mode={background} customUrl={customWallpaperUrl} />
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
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
          {(setupMode === 'multi' || setupMode === 'invite') && (setupMode === 'invite' ? inviteCode : matchId) && (
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel border ${supabaseConnected ? 'border-emerald-500/30 text-emerald-400' : 'border-orange-500/30 text-orange-400'} text-[10px] font-black tracking-widest uppercase`}>
              <div className={`w-1.5 h-1.5 rounded-full ${supabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
              {supabaseConnected ? 'Sync Active' : 'Connecting Sync...'}
            </div>
          )}
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
                <button
                  onClick={() => setSetupMode('invite')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${setupMode === 'invite' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                >
                  Invite Link
                </button>
              </div>

              {renderSetupContent()}

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
              <div className="flex justify-center">
                <button
                  onClick={() => navigate('/watch')}
                  className="bg-white/5 border border-white/10 text-white/60 font-mono-game uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 px-6 py-2 rounded-lg hover:bg-white/10 transition-all"
                >
                  📺 Watch Live Matches
                </button>
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
      <BackgroundLayer mode={background} customUrl={customWallpaperUrl} />
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

            <div className="flex flex-col gap-3 mb-6">
              <Button
                onClick={resetGame}
                className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-lg rounded-2xl shadow-[0_0_20px_rgba(232,65,66,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                🎮 Play Again
              </Button>

              <Button
                onClick={async () => {
                  if (!address) {
                    toast.error("Please connect your wallet first!");
                    return;
                  }

                  setIsVerifying(true);

                  try {
                    // Fetch the source code for verification
                    const response = await fetch('/src/chainlink/scoreVerifier.ts');
                    const source = await response.text();

                    const args = [JSON.stringify(hitHistory)];
                    const donId = stringToHex("fun-avalanche-mainnet-1", { size: 32 }); // Standard for Avalanche

                    writeContract({
                      address: VERIFIER_CONTRACT_ADDRESS as `0x${string}`,
                      abi: VERIFIER_CONTRACT_ABI,
                      functionName: 'sendVerificationRequest',
                      args: [
                        source,
                        args,
                        BigInt(CHAINLINK_SUBSCRIPTION_ID),
                        300000, // callbackGasLimit
                        donId
                      ],
                      account: address as `0x${string}`,
                      chain: avalanche,
                    });

                    toast.success("Verification request sent to Chainlink CRE!");
                  } catch (error) {
                    console.error("Verification failed:", error);
                    toast.error("Failed to initiate verification.");
                  } finally {
                    setIsVerifying(false);
                  }
                }}
                disabled={isVerifying || !hitHistory.length}
                variant="outline"
                className="w-full h-12 border-primary/30 text-primary font-black uppercase tracking-widest text-xs rounded-xl hover:bg-primary/5 transition-all"
              >
                {isVerifying ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...</>
                ) : (
                  '🛡️ Verify Score on Chain (CRE)'
                )}
              </Button>
            </div>

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
              <GameLog messages={gameState.logMessages} p1Name={gameState.players[0].name} p2Name={gameState.players[1].name} />
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
              disabled={!canIThrow}
              onClick={() => {
                // The DartArrow internally handles sending the event,
                // but we can also trigger it from the label below.
                if (canIThrow) window.dispatchEvent(new CustomEvent('THROW_DART'));
              }}
              playerIdx={gameState.currentPlayer}
            />
            <div
              className={`text-center glass-panel px-10 py-5 rounded-3xl border-white/10 transition-all shadow-2xl min-w-[220px] ${canIThrow ? 'hover:bg-white/10 cursor-pointer active:scale-95 group' : 'opacity-20 cursor-not-allowed pointer-events-none'}`}
              onClick={() => {
                if (canIThrow) window.dispatchEvent(new CustomEvent('THROW_DART'));
              }}
            >
              <span className={`text-sm font-black tracking-[0.3em] uppercase ${canIThrow ? 'text-primary' : 'text-white/40'}`}>
                {getLauncherText()}
              </span>
            </div>

            {!gameState.isVsCPU && (
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareSyncLink}
                  className="glass-panel border-primary/20 hover:bg-primary/10 text-primary-light text-[10px] tracking-widest uppercase font-black px-4 py-3 rounded-xl"
                >
                  <Share2 className="w-3 h-3 mr-2" />
                  Sync Link
                </Button>
                {makePublic && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const activeMatchId = setupMode === 'invite' ? inviteCode : String(parsedMatchId || '');
                      const specLink = `${window.location.origin}/watch?match=${activeMatchId}`;
                      await navigator.clipboard.writeText(specLink);
                      toast.success("Spectator Link Copied!", { description: "Anyone can watch this live match." });
                    }}
                    className="glass-panel border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400 text-[10px] tracking-widest uppercase font-black px-4 py-3 rounded-xl"
                  >
                    <Eye className="w-3 h-3 mr-2" />
                    Spectator Link
                  </Button>
                )}
              </div>
            )}
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
        customTracks={customTracks}
        onCustomTrackAdd={handleCustomTrackAdd}
        onCustomTrackDelete={handleCustomTrackDelete}
        background={background}
        onBackgroundChange={setBackground}
        customWallpaperUrl={customWallpaperUrl}
        onCustomWallpaperChange={setCustomWallpaperUrl}
      />

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
