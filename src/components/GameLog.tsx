import React from 'react';
import { RING_NUMBERS } from '../game/boardLayout';

interface GameLogProps {
  messages: string[];
}

const GameLog: React.FC<GameLogProps> = ({ messages }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-4 max-h-[500px] min-h-[300px] overflow-y-auto shadow-sm">
      <h4 className="text-sm text-foreground font-bold uppercase tracking-widest mb-3 font-mono-game border-b border-border pb-2">Game Log</h4>
      <div className="space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground italic font-medium">Throw your first dart!</p>
        ) : (
          [...messages].reverse().slice(0, 15).map((msg, i) => {
            const isP1 = msg.includes("[Player 1]") || (i === 0 && msg.includes("Player 1"));
            const isP2 = msg.includes("[Player 2]") || (i === 0 && msg.includes("Player 2"));
            const isSystem = msg.includes("[SYSTEM]");

            let displayMsg = msg;
            let bgColor = "bg-white/5";
            let textColor = "text-foreground";
            let borderColor = "border-white/10";

            if (isP1) {
              textColor = "text-green-400";
              borderColor = "border-green-500/50";
              displayMsg = msg.replace(/\[.*?\]:\s*/, "");
            } else if (isP2) {
              textColor = "text-red-400";
              borderColor = "border-red-500/50";
              displayMsg = msg.replace(/\[.*?\]:\s*/, "");
            } else if (isSystem) {
              textColor = "text-primary";
              borderColor = "border-primary/50";
              displayMsg = msg.replace(/\[SYSTEM\]:\s*/, "");
            }

            return (
              <div key={i} className={`text-sm font-bold font-mono-game leading-relaxed border-l-2 pl-3 py-1 ${bgColor} rounded-r ${textColor} ${borderColor}`}>
                {displayMsg}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameLog;
