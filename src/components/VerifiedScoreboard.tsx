import React from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { VERIFIER_CONTRACT_ADDRESS, VERIFIER_CONTRACT_ABI } from '../lib/constants';
import { Loader2, ShieldCheck, Trophy, Calendar } from 'lucide-react';

const VerifiedScoreboard: React.FC = () => {
    // 1. Get total number of games
    const { data: gameCount } = useReadContract({
        address: VERIFIER_CONTRACT_ADDRESS as `0x${string}`,
        abi: VERIFIER_CONTRACT_ABI,
        functionName: 'getGameCount',
    });

    const count = gameCount ? Number(gameCount) : 0;

    // 2. Prepare calls for the last 10 games
    // We fetch from count-1 down to 0
    const indices = Array.from({ length: Math.min(count, 10) }, (_, i) => BigInt(count - 1 - i));

    const { data: gameHistory, isLoading } = useReadContracts({
        contracts: indices.map((idx) => ({
            address: VERIFIER_CONTRACT_ADDRESS as `0x${string}`,
            abi: VERIFIER_CONTRACT_ABI,
            functionName: 'history',
            args: [idx],
        })),
    });

    if (isLoading && count > 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-3 glass-panel rounded-3xl border-white/10 h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-black">Decrypting On-Chain History...</span>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-3xl flex flex-col border-white/10 overflow-hidden shadow-2xl h-full animate-in fade-in duration-500">
            <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-white">Verified Global History</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Live Chain</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-3">
                {count === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-white/20">
                        <Trophy className="w-12 h-12 mb-4 opacity-10" />
                        <span className="text-[10px] uppercase tracking-[0.3em] font-black italic">No Records Found</span>
                        <p className="text-[8px] mt-2 opacity-50 uppercase tracking-widest">Verify a game to record the first victory</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {gameHistory?.map((res, i) => {
                            if (res.status !== 'success') return null;
                            const record = res.result as [string, string, bigint, bigint, boolean];
                            const winner = record[0];
                            const winnerName = record[1];
                            const score = record[2];
                            const timestamp = record[3];
                            const verified = record[4];

                            return (
                                <div key={i} className="group relative bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-primary/30 rounded-2xl p-4 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                                                <Trophy className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-white uppercase tracking-wider">{winnerName}</span>
                                                    {verified && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                                                </div>
                                                <span className="text-[9px] text-white/30 font-mono tracking-tighter">
                                                    {winner.slice(0, 6)}...{winner.slice(-4)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black italic text-white group-hover:text-primary transition-colors">
                                                {(Number(score) / 10).toFixed(1)} <span className="text-[9px] not-italic text-white/30 uppercase ml-1">pts</span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1.5 mt-1">
                                                <Calendar className="w-3 h-3 text-white/10" />
                                                <span className="text-[9px] text-white/20 font-medium">
                                                    {new Date(Number(timestamp) * 1000).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {verified && (
                                        <div className="absolute -top-1 -right-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-full p-1 backdrop-blur-md">
                                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="bg-black/40 p-3 text-center border-t border-white/10">
                <span className="text-[8px] text-white/20 uppercase tracking-[0.4em] font-black">
                    Strategic Intelligence Archive
                </span>
            </div>
        </div>
    );
};

export default VerifiedScoreboard;
