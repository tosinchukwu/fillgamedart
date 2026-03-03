import React from 'react';
import { GameState } from '../game/gameLogic';
import { TOTAL_NUMBERS } from '../game/boardLayout';

interface MasterScoringTableProps {
    gameState: GameState;
}

const MasterScoringTable: React.FC<MasterScoringTableProps> = ({ gameState }) => {
    const renderRow = (n: number) => {
        const p1 = gameState.players[0];
        const p2 = gameState.players[1];
        const seq = gameState.hitSequences[n];

        // Personal hits display: "hits/target"
        const p1HitsDisplay = `${p1.hits[n]} / ${n}`;
        const p2HitsDisplay = `${p2.hits[n]} / ${n}`;

        // Filler +2 Earners (Anyone who hit it)
        const fillerEarners = Array.from(new Set(seq)).map(p => p === 0 ? 'A' : 'B').sort().join(', ');

        // Fill-Up bonus (Last to complete)
        let fuEarner = '-';
        if (gameState.closedNumbers.has(n)) {
            // Re-trace sequence to find closing hit
            let p1Rem = n;
            let p2Rem = n;
            for (const p of seq) {
                if (p === 0) p1Rem--;
                else p2Rem--;
                if (p1Rem <= 0 && p2Rem <= 0) {
                    fuEarner = p === 0 ? 'A' : 'B';
                    break;
                }
            }
        }

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
                <td className="py-2 px-3 text-secondary text-[11px] font-black text-center">{fuEarner}</td>
                <td className="py-2 px-3 text-white font-bold text-xs">
                    {calcRunningTotal(n, 0)}
                </td>
                <td className="py-2 px-3 text-white font-bold text-xs">
                    {calcRunningTotal(n, 1)}
                </td>
            </tr>
        );
    };

    const calcRunningTotal = (limitNum: number, playerIdx: 0 | 1) => {
        let score = 0;
        const player = gameState.players[playerIdx];

        // Filler
        for (let n = 1; n <= limitNum; n++) {
            score += player.hits[n] * 2;
        }

        // Fill-Up (Cumulative)
        for (let n = 1; n <= limitNum; n++) {
            if (gameState.closedNumbers.has(n)) {
                const seq = gameState.hitSequences[n];
                let p1Rem = n;
                let p2Rem = n;
                for (const p of seq) {
                    if (p === 0) p1Rem--; else p2Rem--;
                    if (p1Rem <= 0 && p2Rem <= 0) {
                        if (p === playerIdx) score += 10;
                        break;
                    }
                }
            }
        }
        return score;
    };

    // Calculate Top Filler Bonus separately
    const getTopFiller = () => {
        let p1Hits = 0;
        let p2Hits = 0;
        for (let n = 2; n <= TOTAL_NUMBERS; n++) {
            p1Hits += gameState.players[0].hits[n];
            p2Hits += gameState.players[1].hits[n];
        }
        if (p1Hits > p2Hits) return { winner: 'A', bonus: [7, 0] };
        if (p2Hits > p1Hits) return { winner: 'B', bonus: [0, 7] };
        if (p1Hits > 0) return { winner: 'Tie', bonus: [3.5, 3.5] };
        return { winner: '-', bonus: [0, 0] };
    };

    const tf = getTopFiller();

    return (
        <div className="glass-panel rounded-3xl overflow-hidden border-white/10 shadow-2xl flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-black tracking-[0.2em] uppercase text-white flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(232,65,66,0.6)]" />
                    Master Scoring Table
                </h3>
                <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-white/30 uppercase">Top Filler Bonus (2-14)</span>
                        <span className="text-[10px] font-bold text-primary">{tf.winner === 'Tie' ? 'SPLIT (+3.5)' : tf.winner !== '-' ? `${tf.winner} WINS (+7)` : 'NONE'}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-[9px] uppercase tracking-widest text-white/40 border-b border-white/10">
                            <th className="py-3 px-3 font-black">Num</th>
                            <th className="py-3 px-3 font-black">Player A (Hits)</th>
                            <th className="py-3 px-3 font-black">Player B (Hits)</th>
                            <th className="py-3 px-3 font-black text-center">Filler pts</th>
                            <th className="py-3 px-3 font-black text-center">Fill-Up +10</th>
                            <th className="py-3 px-3 font-black">A Running</th>
                            <th className="py-3 px-3 font-black">B Running</th>
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
                        <span className="block text-[8px] text-white/40 uppercase">Total A</span>
                        <span className="text-xl font-black text-white">{gameState.players[0].totalScore}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-[8px] text-white/40 uppercase">Total B</span>
                        <span className="text-xl font-black text-white">{gameState.players[1].totalScore}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default MasterScoringTable;
