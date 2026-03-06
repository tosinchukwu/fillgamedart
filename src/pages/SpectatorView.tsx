import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { GameState } from '../game/gameLogic';
import Dartboard from '../components/Dartboard';
import GameLog from '../components/GameLog';
import MasterScoringTable from '../components/MasterScoringTable';
import { Loader2, Eye, Tv, ArrowLeft, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeaturedMatch {
    match_id: string;
    lobby_host: { name: string; address: string } | null;
    lobby_guest: { name: string; address: string } | null;
    status: string;
}

// Deserialize game state from Supabase (convert closedNumbers array back to Set)
function deserializeGameState(raw: Record<string, unknown>): GameState {
    return {
        ...raw,
        closedNumbers: new Set<number>(Array.isArray(raw.closedNumbers) ? raw.closedNumbers as number[] : []),
    } as GameState;
}

// ─── LOBBY: list of up to 3 featured live matches ────────────────────────────
const SpectatorLobby = ({ onWatch }: { onWatch: (code: string) => void }) => {
    const [matches, setMatches] = useState<FeaturedMatch[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMatches = async () => {
        const { data, error } = await supabase
            .from('matches')
            .select('match_id, lobby_host, lobby_guest, status')
            .eq('is_featured', true)
            .eq('status', 'active')
            .limit(3);

        if (!error && data) {
            setMatches(data as FeaturedMatch[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMatches();
        // Refresh list every 15 seconds so newly started/ended games appear
        const interval = setInterval(fetchMatches, 15000);
        return () => clearInterval(interval);
    }, []);

    const slots = [0, 1, 2];

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 font-mono-game">
            <div className="w-full max-w-xl">

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <Button
                        variant="ghost"
                        className="text-white/30 hover:text-white/70 p-2 rounded-xl"
                        onClick={() => { window.location.hash = ''; }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Tv className="w-6 h-6 text-primary" />
                    <h1 className="text-xl font-black tracking-[0.3em] uppercase text-white">
                        Live Matches
                    </h1>
                    <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
                        <Radio className="w-3 h-3 text-primary animate-pulse" />
                        <span className="text-[10px] text-primary uppercase tracking-widest font-black">Live</span>
                    </div>
                </div>

                <p className="text-[11px] text-white/30 uppercase tracking-widest text-center mb-8">
                    Watch any of the 3 featured matches in real-time
                </p>

                {/* Match Slots */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : slots.map((i) => {
                        const match = matches[i];
                        return (
                            <div
                                key={i}
                                className={`rounded-2xl border p-5 transition-all ${match
                                    ? 'bg-white/5 border-primary/30 hover:border-primary/60 hover:bg-white/8 cursor-pointer'
                                    : 'bg-white/[0.02] border-white/5 cursor-not-allowed opacity-40'}`}
                                onClick={() => match && onWatch(match.match_id)}
                            >
                                {match ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Player 1</span>
                                                <span className="text-sm text-white font-black uppercase tracking-wide">
                                                    {match.lobby_host?.name || '—'}
                                                </span>
                                            </div>
                                            <span className="text-primary font-black text-lg">VS</span>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Player 2</span>
                                                <span className="text-sm text-white font-black uppercase tracking-wide">
                                                    {match.lobby_guest?.name || 'Waiting...'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-xl px-4 py-2">
                                            <Eye className="w-3 h-3 text-primary" />
                                            <span className="text-[10px] text-primary uppercase tracking-widest font-black">Watch</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-white/30 text-[11px] uppercase tracking-widest py-2">
                                        Slot {i + 1} — No Live Match
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <p className="text-[9px] text-white/20 text-center mt-8 uppercase tracking-widest">
                    Featured slots refresh every 15 seconds
                </p>
            </div>
        </div>
    );
};

// ─── LIVE GAME VIEWER: read-only spectator game board ────────────────────────
const SpectatorGame = ({ matchCode, onBack }: { matchCode: string; onBack: () => void }) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [connected, setConnected] = useState(false);
    const [hostName, setHostName] = useState('');
    const [guestName, setGuestName] = useState('');
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        // Fetch initial state
        const fetchInitial = async () => {
            const { data } = await supabase
                .from('matches')
                .select('game_state, lobby_host, lobby_guest')
                .eq('match_id', matchCode)
                .single();

            if (data) {
                if (data.game_state) setGameState(deserializeGameState(data.game_state as Record<string, unknown>));
                setHostName(data.lobby_host?.name || 'Player 1');
                setGuestName(data.lobby_guest?.name || 'Player 2');
            }
        };

        fetchInitial();

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`spectate_${matchCode}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'matches', filter: `match_id=eq.${matchCode}` },
                (payload) => {
                    const raw = payload.new as Record<string, unknown>;
                    if (raw.game_state) setGameState(deserializeGameState(raw.game_state as Record<string, unknown>));
                    if (raw.lobby_host) setHostName((raw.lobby_host as { name: string }).name || 'Player 1');
                    if (raw.lobby_guest) setGuestName((raw.lobby_guest as { name: string }).name || 'Player 2');
                }
            )
            .subscribe((status) => {
                setConnected(status === 'SUBSCRIBED');
            });

        channelRef.current = channel;
        return () => { supabase.removeChannel(channel); };
    }, [matchCode]);

    if (!gameState) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-white/40 text-[11px] uppercase tracking-widest">Loading live match...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
            {/* Top bar */}
            <div className="flex items-center gap-4 px-6 py-3 border-b border-white/5 bg-black/40 backdrop-blur-sm">
                <Button variant="ghost" onClick={onBack} className="text-white/30 hover:text-white/70 p-2 rounded-xl">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2">
                    <Radio className="w-3 h-3 text-red-400 animate-pulse" />
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Live</span>
                </div>
                <span className="text-white/50 text-[11px] font-black tracking-widest uppercase">
                    {hostName} <span className="text-primary">vs</span> {guestName}
                </span>
                <div className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase ${connected ? 'border border-emerald-500/30 text-emerald-400' : 'border border-orange-500/30 text-orange-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                    {connected ? 'Sync Active' : 'Connecting...'}
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-xl">
                    <Eye className="w-3 h-3 text-white/40" />
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-black">Spectating</span>
                </div>
            </div>

            {/* Read-only game board — same layout as normal game, but all interactions disabled */}
            <div className="flex-1 flex gap-4 p-4 pointer-events-none select-none">
                {/* Left: Log */}
                <div className="xl:w-[280px] w-full flex-shrink-0 flex flex-col h-full">
                    <div className="glass-panel rounded-3xl flex-1 flex flex-col border-white/10 overflow-hidden shadow-2xl">
                        <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/40">Game Activity Log</h3>
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <GameLog
                                messages={gameState.logMessages}
                                p1Name={gameState.players[0].name}
                                p2Name={gameState.players[1].name}
                            />
                        </div>
                    </div>
                </div>

                {/* Center: Board */}
                <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                    <Dartboard
                        gameState={gameState}
                        onHitNumber={() => { }}
                        onHitRing={() => { }}
                        disabled={true}
                    />
                    <div className="mt-6 px-8 py-4 rounded-3xl glass-panel border-white/5 text-center opacity-30">
                        <span className="text-[11px] font-black tracking-[0.3em] uppercase text-white/40">Spectator Mode</span>
                    </div>
                </div>

                {/* Right: Scoreboard */}
                <div className="xl:w-[580px] w-full flex-shrink-0 flex flex-col h-full shadow-2xl">
                    <MasterScoringTable gameState={gameState} />
                </div>
            </div>
        </div>
    );
};

// ─── MAIN EXPORT: routes between lobby and game view ─────────────────────────
const SpectatorView = () => {
    const [watchCode, setWatchCode] = useState<string | null>(null);

    useEffect(() => {
        const readHash = () => {
            const hash = window.location.hash;
            const match = hash.match(/^#watch=([a-zA-Z0-9]+)$/);
            setWatchCode(match ? match[1] : null);
        };
        readHash();
        window.addEventListener('hashchange', readHash);
        return () => window.removeEventListener('hashchange', readHash);
    }, []);

    const handleWatch = (code: string) => {
        window.location.hash = `#watch=${code}`;
    };

    const handleBack = () => {
        window.location.hash = '#spectate';
    };

    if (watchCode) {
        return <SpectatorGame matchCode={watchCode} onBack={handleBack} />;
    }

    return <SpectatorLobby onWatch={handleWatch} />;
};

export default SpectatorView;
