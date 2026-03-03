import React from 'react';
import { RING_NUMBERS } from '../game/boardLayout';

interface GameLogProps {
  messages: string[];
}

const GameLog: React.FC<GameLogProps> = ({ messages }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-4 max-h-48 overflow-y-auto shadow-sm">
      <h4 className="text-sm text-foreground font-bold uppercase tracking-widest mb-3 font-mono-game border-b border-border pb-2">Game Log</h4>
      <div className="space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground italic font-medium">Throw your first dart!</p>
        ) : (
          [...messages].reverse().slice(0, 15).map((msg, i) => (
            <div key={i} className={`text-sm font-bold font-mono-game leading-relaxed border-l-2 pl-3 py-1 bg-white/5 rounded-r ${msg.includes("[Player 1]") || msg.includes("Player 1 exceeded") || msg.includes("Player 1 wins")
                ? "text-green-400 border-green-500/50"
                : msg.includes("[Player 2]") || msg.includes("Player 2 exceeded") || msg.includes("Player 2 wins")
                  ? "text-red-400 border-red-500/50"
                  : "text-foreground border-white/10"
              }`}>
              {msg}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GameLog;
