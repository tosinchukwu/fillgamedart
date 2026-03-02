import React from 'react';
import { PlayerState } from '../game/gameLogic';
import { TOTAL_NUMBERS } from '../game/boardLayout';

interface ScoreboardProps {
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
  dartsRemaining: number;
  batch: 1 | 2;
  batch1Score: number | null;
  closedNumbers: Set<number>;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  players, currentPlayer, dartsRemaining, batch, batch1Score, closedNumbers
}) => {
  return (
    <div className="space-y-4 w-full">
      {/* Batch indicator */}
      <div className="text-center">
        <span className="font-mono-game text-xs tracking-widest text-muted-foreground uppercase">
          Batch {batch}
        </span>
        {batch === 2 && batch1Score && (
          <p className="text-xs text-accent font-mono-game mt-1">Target: {batch1Score} pts</p>
        )}
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-3">
        {players.map((p, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 border transition-all ${
              currentPlayer === i
                ? 'border-primary bg-primary/10 glow-green'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold truncate">{p.name}</h3>
              {currentPlayer === i && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono-game">
                  🎯 {dartsRemaining}
                </span>
              )}
            </div>
            
            <div className="text-2xl font-mono-game font-bold text-foreground">
              {p.totalScore}
              <span className="text-xs text-muted-foreground ml-1">pts</span>
            </div>

            <div className="mt-2 space-y-1 text-xs text-muted-foreground font-mono-game">
              <div className="flex justify-between">
                <span>Filler</span>
                <span className="text-foreground">{p.fillerPoints}</span>
              </div>
              <div className="flex justify-between">
                <span>Top Bonus</span>
                <span className="text-accent">{p.topFillerBonuses}</span>
              </div>
              <div className="flex justify-between">
                <span>Fill-Up</span>
                <span className="text-secondary">{p.fillUpBonuses}</span>
              </div>
            </div>

            {/* Completion grid */}
            <div className="mt-3 grid grid-cols-7 gap-1">
              {Array.from({ length: TOTAL_NUMBERS }, (_, idx) => idx + 1).map((num) => (
                <div
                  key={num}
                  className={`w-6 h-6 rounded text-[10px] font-mono-game flex items-center justify-center font-bold ${
                    closedNumbers.has(num)
                      ? 'bg-muted text-muted-foreground line-through'
                      : p.completed[num]
                      ? 'bg-primary/30 text-primary'
                      : p.hits[num] > 0
                      ? 'bg-accent/20 text-accent'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Scoreboard;
