import React from 'react';
import { RING_NUMBERS } from '../game/boardLayout';

interface GameLogProps {
  messages: string[];
  p1Name: string;
  p2Name: string;
}

const GameLog: React.FC<GameLogProps> = ({ messages, p1Name, p2Name }) => {
  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 max-h-[500px] min-h-[300px] overflow-y-auto shadow-2xl glass-panel custom-scrollbar">
      <h4 className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mb-4 font-mono-game border-b border-white/10 pb-3 flex items-center justify-between">
        Tactical Game Log
        <span className="text-[9px] text-white/30 animate-pulse">Live Feed</span>
      </h4>
      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-white/5 rounded-xl">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-mono-game animate-pulse">Waiting for first engagement...</p>
          </div>
        ) : (
          [...messages].reverse().slice(0, 30).map((msg, i) => {
            const isP1 = msg.includes(`[${p1Name}]`);
            const isP2 = msg.includes(`[${p2Name}]`);
            const isSystem = msg.includes("[SYSTEM]");

            let displayMsg = msg;
            let bgColor = "bg-white/5";
            let textColor = "text-white/80";
            let borderColor = "border-white/5";

            if (isP1) {
              textColor = "text-primary";
              borderColor = "border-primary/30";
              bgColor = "bg-primary/5";
              displayMsg = msg.replace(/\[.*?\]:\s*/, "");
            } else if (isP2) {
              textColor = "text-secondary";
              borderColor = "border-secondary/30";
              bgColor = "bg-secondary/5";
              displayMsg = msg.replace(/\[.*?\]:\s*/, "");
            } else if (isSystem) {
              textColor = "text-white";
              borderColor = "border-white/20";
              bgColor = "bg-white/10";
              displayMsg = msg.replace(/\[SYSTEM\]:\s*/, "");
            }

            return (
              <div key={i} className={`text-[11px] font-medium font-mono-game leading-relaxed border-l-2 pl-4 py-2 ${bgColor} rounded-r-xl ${textColor} ${borderColor} transition-all hover:bg-white/10 group`}>
                <span className="opacity-100 group-hover:opacity-100 transition-opacity">{displayMsg}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameLog;
