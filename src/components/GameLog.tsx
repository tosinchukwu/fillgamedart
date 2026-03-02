import React from 'react';
import { RING_NUMBERS } from '../game/boardLayout';

interface GameLogProps {
  messages: string[];
}

const GameLog: React.FC<GameLogProps> = ({ messages }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-3 max-h-40 overflow-y-auto">
      <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-mono-game">Game Log</h4>
      <div className="space-y-1">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Throw your first dart!</p>
        ) : (
          [...messages].reverse().slice(0, 15).map((msg, i) => (
            <p key={i} className={`text-xs font-mono-game ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {msg}
            </p>
          ))
        )}
      </div>
    </div>
  );
};

export default GameLog;
