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
        const p1 = gameState.players[0];
        const p2 = gameState.players[1];
        const seq = gameState.hitSequences[n];

        // Ordinal positions for Hits
        const p1Positions = seq.map((p, i) => p === 0 ? getOrdinal(i + 1) : null).filter(Boolean);
        const p2Positions = seq.map((p, i) => p === 1 ? getOrdinal(i + 1) : null).filter(Boolean);

        const p1HitsDisplay = p1Positions.length > 0 ? p1Positions.join(', ') : '-';
        const p2HitsDisplay = p2Positions.length > 0 ? p2Positions.join(', ') : '-';

        // Filler +2 Earners in order
        const fillerEarners = seq.map(p => p === 0 ? 'A' : 'B').join(', ');

        // Top Filler bonus (Highest hits) - Only for 2-14
        // CONDITION: Triggered once at least ONE player has hit more than half of the number
        let tfpEarner = '-';
        let tfpA = 0;
        let tfpB = 0;
        if (n >= 2) {
            const threshold = n / 2;
            if (p1.hits[n] > threshold || p2.hits[n] > threshold) {
                if (p1.hits[n] > p2.hits[n]) {
                    tfpEarner = 'A';
                    tfpA = 7;
                } else if (p2.hits[n] > p1.hits[n]) {
                    tfpEarner = 'B';
                    tfpB = 7;
                } else {
                    tfpEarner = 'A, B';
                    tfpA = 3.5;
                    tfpB = 3.5;
                }
            }
        }

        // Fill-Up bonus (Last to complete both OR per-hit for Number 1)
        let fuEarner = '-';
        let fuA = 0;
        let fuB = 0;
        if (n === 1) {
            const earners = [];
            if (p1.num1AwardedBatch1 || p1.num1AwardedBatch2) earners.push('A');
            if (p2.num1AwardedBatch1 || p2.num1AwardedBatch2) earners.push('B');
            fuEarner = earners.join(', ') || '-';
            fuA = (p1.num1AwardedBatch1 ? 10 : 0) + (p1.num1AwardedBatch2 ? 10 : 0);
            fuB = (p2.num1AwardedBatch1 ? 10 : 0) + (p2.num1AwardedBatch2 ? 10 : 0);
        } else if (gameState.closedNumbers.has(n) && seq.length > 0) {
            const lastPlayer = seq[seq.length - 1];
            fuEarner = lastPlayer === 0 ? 'A' : 'B';
            if (lastPlayer === 0) fuA = 10; else fuB = 10;
        }

        // Filler points for this row (Capped at n*2, EXCEPT for Number 1)
        const fillerA = n === 1 ? ((p1.num1AwardedBatch1 ? 2 : 0) + (p1.num1AwardedBatch2 ? 2 : 0)) : Math.min(p1.hits[n] * 2 + p1.bonusPoints[n], n * 2);
        const fillerB = n === 1 ? ((p2.num1AwardedBatch1 ? 2 : 0) + (p2.num1AwardedBatch2 ? 2 : 0)) : Math.min(p2.hits[n] * 2 + p2.bonusPoints[n], n * 2);

        const totalA = fillerA + tfpA + fuA;
        const totalB = fillerB + tfpB + fuB;

        return (
            <tr key={n} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="py-2 px-3 text-white/50 text-xs font-mono font-bold">{n}</td>
                <td className={`py-2 px-3 font-medium text-[11px] ${p1.completed[n] ? 'text-primary' : 'text-white/70'}`}>
                    {p1HitsDisplay}
                </td>
                <td className={`py-2 px-3 font-medium text-[11px] ${p2.completed[n] ? 'text-secondary' : 'text-white/70'}`}>
                    {p2HitsDisplay}
                </td>
                <td className="py-2 px-3 text-white/50 text-[10px] text-center">{fillerEarners || '-'}</td>
                <td className="py-2 px-3 text-primary text-[11px] font-black text-center">{tfpEarner}</td>
                <td className="py-2 px-3 text-secondary text-[11px] font-black text-center">{fuEarner}</td>
                <td className="py-2 px-3 text-primary font-bold text-xs text-center">
                    {totalA > 0 ? totalA : '-'}
                </td>
                <td className="py-2 px-3 text-secondary font-bold text-xs text-center">
                    {totalB > 0 ? totalB : '-'}
                </td>
            </tr>
        );
    };

    return (
        <div className="glass-panel rounded-3xl overflow-hidden border-white/10 shadow-2xl flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-black tracking-[0.2em] uppercase text-white flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(232,65,66,0.6)]" />
                    MASTER SCORING TABLE (Number-Based Format)
                </h3>
                <span className="text-[10px] font-mono-game text-white/30 uppercase tracking-widest hidden sm:inline">Strategy Logic Applied</span>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-[9px] uppercase tracking-widest text-white/40 border-b border-white/10">
                            <th className="py-3 px-3 font-black">Dart No</th>
                            <th className="py-3 px-3 font-black">{gameState.players[0].name.toUpperCase()} (Hit Position)</th>
                            <th className="py-3 px-3 font-black">{gameState.players[1].name.toUpperCase()} (Hit Position)</th>
                            <th className="py-3 px-3 font-black text-center">Filler +2 (Who Earned)</th>
                            <th className="py-3 px-3 font-black text-center">Top Filler +7</th>
                            <th className="py-3 px-3 font-black text-center">Fill Up +10</th>
                            <th className="py-3 px-3 font-black text-center">{gameState.players[0].name.toUpperCase()} Total</th>
                            <th className="py-3 px-3 font-black text-center">{gameState.players[1].name.toUpperCase()} Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map(renderRow)}
                    </tbody>
                </table>
            </div>

            <div className="bg-black/40 p-4 border-t border-white/10 flex justify-between items-center font-mono-game">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest">Board Status</span>
                    <span className="text-[11px] text-primary font-bold uppercase tracking-widest">
                        {gameState.closedNumbers.size} / {TOTAL_NUMBERS} Fully Closed
                    </span>
                </div>
                <div className="flex gap-6">
                    <div className="text-right">
                        <span className="block text-[8px] text-white/40 uppercase">Total {gameState.players[0].name}</span>
                        <span className="text-xl font-black text-white">{gameState.players[0].totalScore}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-[8px] text-white/40 uppercase">Total {gameState.players[1].name}</span>
                        <span className="text-xl font-black text-white">{gameState.players[1].totalScore}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default MasterScoringTable;
