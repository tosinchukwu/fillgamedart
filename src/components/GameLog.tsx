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
            <p key={i} className={`text-sm font-bold font-mono-game leading-relaxed ${i === 0 ? 'text-primary' : 'text-foreground'}`}>
              {msg}
            </p>
          ))
        )}
      </div>
    </div>
  );
};

export default GameLog;
