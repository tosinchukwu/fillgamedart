import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { GameState } from '../game/gameLogic';
import Dartboard from '../components/Dartboard';
import BackgroundLayer from '../components/BackgroundLayer';
import GameLog from '../components/GameLog';
import MasterScoringTable from '../components/MasterScoringTable';
import { Loader2, Eye, Tv, ArrowLeft, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeaturedMatch {
    match_id: string;
    lobby_host: { name: string; address: string } | null;
    lobby_guest: { name: string; address: string } | null;
    status: string;
    updated_at: string;
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
    const navigate = useNavigate();
    const [matches, setMatches] = useState<FeaturedMatch[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMatches = async () => {
        const { data, error } = await supabase
            .from('matches')
            .select('match_id, lobby_host, lobby_guest, status, updated_at')
            .eq('is_featured', true)
            .eq('status', 'active')
            .limit(10); // Fetch more to filter down to 3 fresh ones

        if (!error && data) {
            // Filter out "stale" matches where updated_at is older than 90 seconds
            const now = Date.now();
            const freshMatches = (data as FeaturedMatch[]).filter(m => {
                const updated = new Date(m.updated_at).getTime();
                return (now - updated) < 90000; // 90 seconds threshold
            }).slice(0, 3);

            setMatches(freshMatches);
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
            <BackgroundLayer mode="stadium" />
            <div className="w-full max-w-xl relative z-10">

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <Button
                        variant="ghost"
                        className="text-white/30 hover:text-white/70 p-2 rounded-xl"
                        onClick={() => navigate('/')}
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
        <div className={`min-h-screen bg-[#0a0a0f] flex flex-col theme-${gameState.theme || 'neon'}`}>
            <BackgroundLayer mode="stadium" />
            {/* Top bar — wraps on small screens */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/40 backdrop-blur-sm">
                <Button variant="ghost" onClick={onBack} className="text-white/30 hover:text-white/70 p-2 rounded-xl shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2 shrink-0">
                    <Radio className="w-3 h-3 text-red-400 animate-pulse" />
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Live</span>
                </div>
                <span className="text-white/60 text-[11px] font-black tracking-widest uppercase flex-1 text-center">
                    {hostName} <span className="text-primary">vs</span> {guestName}
                </span>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[9px] font-black tracking-widest uppercase shrink-0 ${connected ? 'border border-emerald-500/30 text-emerald-400' : 'border border-orange-500/30 text-orange-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                    {connected ? 'Sync' : 'Connecting'}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-xl shrink-0">
                    <Eye className="w-3 h-3 text-white/40" />
                    <span className="text-[9px] text-white/40 uppercase tracking-widest font-black hidden sm:block">Spectating</span>
                </div>
            </div>

            {/* Responsive game board layout */}
            <div className="flex-1 flex flex-col xl:flex-row gap-3 p-3 md:p-4 pointer-events-none select-none overflow-auto">

                {/* Game Log — full width on mobile, fixed sidebar on desktop */}
                <div className="w-full xl:w-[260px] xl:flex-shrink-0 xl:flex xl:flex-col">
                    <div className="glass-panel rounded-2xl flex flex-col border-white/10 overflow-hidden shadow-xl h-48 xl:h-full">
                        <div className="bg-white/5 px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
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

                {/* Center: Dartboard — grows to fill available space, stays centered */}
                <div className="flex-1 flex flex-col items-center justify-center min-w-0 py-2">
                    <div className="w-full flex items-center justify-center">
                        <Dartboard
                            gameState={gameState}
                            onHitNumber={() => { }}
                            onHitRing={() => { }}
                            disabled={true}
                            isSpectator={true}
                        />
                    </div>
                    <div className="mt-3 px-6 py-2 rounded-2xl glass-panel border-white/5 text-center opacity-40">
                        <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white/40">👁 Spectator Mode</span>
                    </div>
                </div>

                {/* Right: Scoreboard — full width on mobile, fixed sidebar on desktop */}
                <div className="w-full xl:w-[580px] xl:flex-shrink-0 shadow-xl">
                    <MasterScoringTable gameState={gameState} />
                </div>

            </div>
        </div>
    );
};

// ─── MAIN EXPORT: routes between lobby and game view ─────────────────────────
const SpectatorView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const watchCode = searchParams.get('match');

    const handleWatch = (code: string) => {
        setSearchParams({ match: code });
    };

    const handleBack = () => {
        setSearchParams({});
    };

    if (watchCode) {
        return <SpectatorGame matchCode={watchCode} onBack={handleBack} />;
    }

    return <SpectatorLobby onWatch={handleWatch} />;
};

export default SpectatorView;
