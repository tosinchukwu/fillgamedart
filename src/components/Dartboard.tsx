import React from 'react';
import { BOARD_LAYOUT, RING_RADII, RING_NUMBERS } from '../game/boardLayout';
import { GameState } from '../game/gameLogic';

interface DartboardProps {
  gameState: GameState;
  onHitNumber: (num: number) => void;
  onHitRing: (ringIndex: number) => void;
  disabled: boolean;
}

const CENTER = 250;
const SCALE = 1.1;

function polarToXY(angle: number, radius: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad) * SCALE, CENTER + radius * Math.sin(rad) * SCALE];
}

const Dartboard: React.FC<DartboardProps> = ({ gameState, onHitNumber, onHitRing, disabled }) => {
  const cp = gameState.currentPlayer;
  const player = gameState.players[cp];

  return (
    <svg viewBox="0 0 500 500" className="w-full max-w-lg mx-auto drop-shadow-2xl">
      {/* Board background */}
      <circle cx={CENTER} cy={CENTER} r={245} fill="hsl(220, 20%, 6%)" stroke="hsl(220, 15%, 15%)" strokeWidth="3" />

      {/* Concentric rings - clickable */}
      {RING_RADII.map((ring, i) => {
        const avgR = ((ring.inner + ring.outer) / 2) * SCALE;
        return (
          <circle
            key={`ring-${i}`}
            cx={CENTER}
            cy={CENTER}
            r={avgR}
            fill="none"
            stroke="hsl(0, 0%, 75%)"
            strokeWidth="2.5"
            opacity="0.5"
            className={!disabled ? 'cursor-pointer hover:opacity-100 transition-opacity' : ''}
            onClick={() => !disabled && onHitRing(i)}
          />
        );
      })}

      {/* Ring hit zones (invisible but clickable between numbers) */}
      {RING_RADII.map((ring, i) => (
        <circle
          key={`ring-zone-${i}`}
          cx={CENTER}
          cy={CENTER}
          r={((ring.inner + ring.outer) / 2) * SCALE}
          fill="transparent"
          stroke="transparent"
          strokeWidth={(ring.outer - ring.inner) * SCALE * 0.4}
          className={!disabled ? 'cursor-pointer' : ''}
          onClick={() => !disabled && onHitRing(i)}
        />
      ))}

      {/* Number positions */}
      {BOARD_LAYOUT.map((pos) => {
        const ringData = RING_RADII[pos.ring];
        const r = ((ringData.inner + ringData.outer) / 2);
        const [x, y] = polarToXY(pos.angle, r);
        const isCompleted = player.completed[pos.number];
        const isClosed = gameState.closedNumbers.has(pos.number);
        const progress = player.hits[pos.number] / pos.number;

        return (
          <g
            key={pos.number}
            onClick={() => !disabled && !isClosed && onHitNumber(pos.number)}
            className={!disabled && !isClosed ? 'cursor-pointer group' : isClosed ? 'opacity-30' : ''}
          >
            {/* Progress ring */}
            <circle
              cx={x}
              cy={y}
              r={18}
              fill="none"
              stroke={isCompleted ? 'hsl(145, 60%, 45%)' : 'hsl(220, 15%, 25%)'}
              strokeWidth="3"
              strokeDasharray={`${Math.min(progress, 1) * 113} 113`}
              transform={`rotate(-90 ${x} ${y})`}
            />
            
            {/* Number circle */}
            <circle
              cx={x}
              cy={y}
              r={15}
              fill={
                isClosed ? 'hsl(220, 15%, 20%)' :
                isCompleted ? 'hsl(145, 60%, 25%)' :
                pos.color === 'red' ? 'hsl(0, 70%, 40%)' : 'hsl(145, 55%, 30%)'
              }
              stroke={
                isClosed ? 'hsl(220, 15%, 30%)' :
                isCompleted ? 'hsl(145, 60%, 50%)' :
                'hsl(0, 0%, 60%)'
              }
              strokeWidth="1.5"
              className={!disabled && !isClosed ? 'group-hover:brightness-125 transition-all' : ''}
            />

            {/* Number text */}
            <text
              x={x}
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isClosed ? 'hsl(220, 10%, 40%)' : 'hsl(0, 0%, 95%)'}
              fontSize="13"
              fontWeight="bold"
              fontFamily="'Bebas Neue', sans-serif"
              letterSpacing="0.5"
              className="pointer-events-none select-none"
            >
              {pos.number}
            </text>

            {/* Hit count */}
            {player.hits[pos.number] > 0 && !isClosed && (
              <text
                x={x}
                y={y - 22}
                textAnchor="middle"
                dominantBaseline="central"
                fill="hsl(45, 90%, 55%)"
                fontSize="9"
                fontWeight="bold"
                fontFamily="'JetBrains Mono', monospace"
                className="pointer-events-none"
              >
                {player.hits[pos.number]}/{pos.number}
              </text>
            )}
          </g>
        );
      })}

      {/* Bullseye */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={20}
        fill="hsl(0, 70%, 40%)"
        stroke="hsl(0, 0%, 75%)"
        strokeWidth="2"
        opacity="0.6"
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={8}
        fill="hsl(0, 70%, 55%)"
        stroke="hsl(0, 0%, 85%)"
        strokeWidth="1"
      />
    </svg>
  );
};

export default Dartboard;
