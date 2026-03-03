import React from 'react';
import { GameState } from '../game/gameLogic';
import { TOTAL_NUMBERS } from '../game/boardLayout';

interface MasterScoringTableProps {
    gameState: GameState;
}

const MasterScoringTable: React.FC<MasterScoringTableProps> = ({ gameState }) => {
    const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const renderRow = (n: number) => {
        const seq = gameState.hitSequences[n];
        const playerASequence = seq
            .map((p, i) => (p === 0 ? getOrdinal(i + 1) : null))
            .filter(Boolean)
            .join(', ');
        const playerBSequence = seq
            .map((p, i) => (p === 1 ? getOrdinal(i + 1) : null))
            .filter(Boolean)
            .join(', ');

        // Filler +2 (Who earned)
        const fillerEarners = Array.from(new Set(seq)).map(p => p === 0 ? 'A' : 'B').sort().join(', ');

        // TFP +7 (Who earned)
        let tfpEarners = '-';
        if (n >= 2 && seq.length > 0) {
            const aHits = seq.filter(p => p === 0).length;
            const bHits = seq.filter(p => p === 1).length;
            if (aHits > bHits) tfpEarners = 'A';
            else if (bHits > aHits) tfpEarners = 'B';
            else tfpEarners = 'A, B';
        }

        // FU +10 (Who earned)
        const fuEarner = seq.length >= n ? (seq[n - 1] === 0 ? 'A' : 'B') : '-';

        // Totals up to this number (for visualization similar to the image)
        // In a real game, this might be row-specific or cumulative. 
        // The image shows total scores, so let's just leave them as placeholder or computed if possible.
        // For now, let's just show "-" as the image shows empty rows.

        return (
            <tr key={n} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="py-2 px-3 text-white/50 text-xs font-mono font-bold">{n}</td>
                <td className="py-2 px-3 text-primary/80 font-medium text-[11px]">{playerASequence || '-'}</td>
                <td className="py-2 px-3 text-secondary/80 font-medium text-[11px]">{playerBSequence || '-'}</td>
                <td className="py-2 px-3 text-white/70 text-[11px]">{fillerEarners || '-'}</td>
                <td className="py-2 px-3 text-primary text-[11px] font-bold">{tfpEarners}</td>
                <td className="py-2 px-3 text-secondary text-[11px] font-bold">{fuEarner}</td>
                <td className="py-2 px-3 text-white font-bold text-xs">
                    {seq.length > 0 ? (calcRunningTotal(n, 0)) : '-'}
                </td>
                <td className="py-2 px-3 text-white font-bold text-xs">
                    {seq.length > 0 ? (calcRunningTotal(n, 1)) : '-'}
                </td>
            </tr>
        );
    };

    const calcRunningTotal = (limitNum: number, playerIdx: 0 | 1) => {
        let score = 0;
        for (let n = 1; n <= limitNum; n++) {
            const seq = gameState.hitSequences[n];
            const playerHits = seq.filter(p => p === playerIdx).length;
            score += playerHits * 2; // Filler

            if (n >= 2 && seq.length > 0) {
                const opponentHits = seq.filter(p => p === 1 - playerIdx).length;
                if (playerHits > opponentHits) score += 7;
                else if (playerHits === opponentHits) score += 3.5;
            }

            if (seq.length >= n && seq[n - 1] === playerIdx) {
                score += 10; // Fill-Up
            }
        }
        return score;
    };

    return (
        <div className="glass-panel rounded-3xl overflow-hidden border-white/10 shadow-2xl flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-black tracking-[0.2em] uppercase text-white flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(232,65,66,0.6)]" />
                    Master Scoring Table
                </h3>
                <span className="text-[10px] font-mono-game text-white/30 uppercase tracking-widest">Number-Based Format</span>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-[9px] uppercase tracking-widest text-white/40 border-b border-white/10">
                            <th className="py-3 px-3 font-black">Num</th>
                            <th className="py-3 px-3 font-black">Player A (Hits)</th>
                            <th className="py-3 px-3 font-black">Player B (Hits)</th>
                            <th className="py-3 px-3 font-black text-center">Filler +2</th>
                            <th className="py-3 px-3 font-black text-center">TFP +7</th>
                            <th className="py-3 px-3 font-black text-center">FU +10</th>
                            <th className="py-3 px-3 font-black">A Total</th>
                            <th className="py-3 px-3 font-black">B Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map(renderRow)}
                    </tbody>
                </table>
            </div>

            <div className="bg-black/40 p-4 border-t border-white/10 flex justify-between items-center font-mono-game">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest">Live Status</span>
                    <span className="text-[11px] text-primary font-bold uppercase tracking-widest">
                        {gameState.closedNumbers.size} / {TOTAL_NUMBERS} Numbers Closed
                    </span>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <span className="block text-[8px] text-white/40 uppercase">P1 Score</span>
                        <span className="text-lg font-black text-white">{gameState.players[0].totalScore}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-[8px] text-white/40 uppercase">P2 Score</span>
                        <span className="text-lg font-black text-white">{gameState.players[1].totalScore}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MasterScoringTable;
