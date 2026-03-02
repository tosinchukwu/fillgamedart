import React, { useState, useCallback, useEffect } from 'react';
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

interface DartAnimation {
  id: number;
  x: number;
  y: number;
  phase: 'flying' | 'stuck' | 'fading';
}

let dartIdCounter = 0;

const Dartboard: React.FC<DartboardProps> = ({ gameState, onHitNumber, onHitRing, disabled }) => {
  const cp = gameState.currentPlayer;
  const player = gameState.players[cp];
  const [darts, setDarts] = useState<DartAnimation[]>([]);

  // Clean up fading darts
  useEffect(() => {
    const timer = setInterval(() => {
      setDarts(prev => prev.filter(d => d.phase !== 'fading'));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const throwDart = useCallback((x: number, y: number, callback: () => void) => {
    const id = ++dartIdCounter;
    setDarts(prev => [...prev, { id, x, y, phase: 'flying' }]);
    
    // After flight animation, mark as stuck
    setTimeout(() => {
      setDarts(prev => prev.map(d => d.id === id ? { ...d, phase: 'stuck' } : d));
      callback();
      // Start fading after a moment
      setTimeout(() => {
        setDarts(prev => prev.map(d => d.id === id ? { ...d, phase: 'fading' } : d));
      }, 800);
    }, 350);
  }, []);

  const handleHitNumber = useCallback((num: number, x: number, y: number) => {
    if (disabled) return;
    const isClosed = gameState.closedNumbers.has(num);
    if (isClosed) return;
    throwDart(x, y, () => onHitNumber(num));
  }, [disabled, gameState.closedNumbers, onHitNumber, throwDart]);

  const handleHitRing = useCallback((ringIndex: number, x: number, y: number) => {
    if (disabled) return;
    const nums = RING_NUMBERS[ringIndex];
    if (!nums || nums.length === 0) return;
    throwDart(x, y, () => onHitRing(ringIndex));
  }, [disabled, onHitRing, throwDart]);

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Dartboard image */}
      <div className="relative rounded-full overflow-hidden shadow-2xl border-4 border-border">
        <img
          src="/dartboard.jpg"
          alt="Dartboard"
          className="w-full h-auto block"
          draggable={false}
        />
        
        {/* SVG overlay for interactive elements */}
        <svg
          viewBox="0 0 500 500"
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          {/* Ring click zones (invisible) */}
          {RING_RADII.map((ring, i) => {
            const avgR = ((ring.inner + ring.outer) / 2) * SCALE;
            const thickness = (ring.outer - ring.inner) * SCALE * 0.5;
            return (
              <circle
                key={`ring-zone-${i}`}
                cx={CENTER}
                cy={CENTER}
                r={avgR}
                fill="transparent"
                stroke="transparent"
                strokeWidth={thickness}
                style={{ pointerEvents: 'stroke' }}
                className={!disabled ? 'cursor-pointer' : ''}
                onClick={(e) => {
                  e.stopPropagation();
                  const svg = e.currentTarget.ownerSVGElement;
                  if (!svg) return;
                  const pt = svg.createSVGPoint();
                  const rect = svg.getBoundingClientRect();
                  pt.x = ((e.clientX - rect.left) / rect.width) * 500;
                  pt.y = ((e.clientY - rect.top) / rect.height) * 500;
                  handleHitRing(i, pt.x, pt.y);
                }}
              />
            );
          })}

          {/* Number positions with overlays */}
          {BOARD_LAYOUT.map((pos) => {
            const ringData = RING_RADII[pos.ring];
            const r = (ringData.inner + ringData.outer) / 2;
            const [x, y] = polarToXY(pos.angle, r);
            const isCompleted = player.completed[pos.number];
            const isClosed = gameState.closedNumbers.has(pos.number);
            const progress = player.hits[pos.number] / pos.number;

            return (
              <g
                key={pos.number}
                style={{ pointerEvents: 'all' }}
                onClick={() => handleHitNumber(pos.number, x, y)}
                className={!disabled && !isClosed ? 'cursor-pointer group' : isClosed ? 'opacity-30' : ''}
              >
                {/* Hit zone (larger invisible circle for easier clicking) */}
                <circle
                  cx={x}
                  cy={y}
                  r={22}
                  fill="transparent"
                />

                {/* Progress ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={19}
                  fill="none"
                  stroke={isCompleted ? 'hsl(145, 60%, 50%)' : 'hsl(220, 15%, 30%)'}
                  strokeWidth="3"
                  strokeDasharray={`${Math.min(progress, 1) * 119.4} 119.4`}
                  transform={`rotate(-90 ${x} ${y})`}
                  style={{ transition: 'stroke-dasharray 0.4s ease' }}
                />

                {/* Glowing background */}
                <circle
                  cx={x}
                  cy={y}
                  r={16}
                  fill={
                    isClosed ? 'hsla(220, 15%, 10%, 0.85)' :
                    isCompleted ? 'hsla(145, 60%, 20%, 0.9)' :
                    'hsla(220, 20%, 8%, 0.85)'
                  }
                  stroke={
                    isClosed ? 'hsl(220, 15%, 25%)' :
                    isCompleted ? 'hsl(145, 60%, 50%)' :
                    'hsl(0, 0%, 50%)'
                  }
                  strokeWidth="1.5"
                  className={!disabled && !isClosed ? 'group-hover:fill-[hsla(220,20%,15%,0.95)] transition-all duration-200' : ''}
                />

                {/* Number text */}
                <text
                  x={x}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={
                    isClosed ? 'hsl(220, 10%, 35%)' :
                    isCompleted ? 'hsl(145, 60%, 70%)' :
                    'hsl(0, 0%, 95%)'
                  }
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="'Bebas Neue', sans-serif"
                  letterSpacing="0.5"
                  className="pointer-events-none select-none"
                >
                  {pos.number}
                </text>

                {/* Hit count badge */}
                {player.hits[pos.number] > 0 && !isClosed && (
                  <g className="pointer-events-none">
                    <rect
                      x={x - 12}
                      y={y - 32}
                      width={24}
                      height={14}
                      rx={4}
                      fill="hsla(220, 20%, 8%, 0.9)"
                      stroke="hsl(45, 90%, 55%)"
                      strokeWidth="0.8"
                    />
                    <text
                      x={x}
                      y={y - 24}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="hsl(45, 90%, 55%)"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {player.hits[pos.number]}/{pos.number}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Dart throwing animations */}
          {darts.map((dart) => (
            <g key={dart.id}>
              {dart.phase === 'flying' && (
                <g className="animate-dart-fly" style={{ transformOrigin: `${dart.x}px ${dart.y}px` }}>
                  {/* Dart body */}
                  <line
                    x1={dart.x}
                    y1={dart.y + 60}
                    x2={dart.x}
                    y2={dart.y - 5}
                    stroke="hsl(0, 0%, 75%)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Dart tip */}
                  <line
                    x1={dart.x}
                    y1={dart.y - 5}
                    x2={dart.x}
                    y2={dart.y - 14}
                    stroke="hsl(0, 0%, 90%)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  {/* Dart flights */}
                  <polygon
                    points={`${dart.x},${dart.y + 50} ${dart.x - 8},${dart.y + 65} ${dart.x},${dart.y + 55}`}
                    fill="hsl(0, 70%, 50%)"
                    opacity="0.9"
                  />
                  <polygon
                    points={`${dart.x},${dart.y + 50} ${dart.x + 8},${dart.y + 65} ${dart.x},${dart.y + 55}`}
                    fill="hsl(0, 70%, 40%)"
                    opacity="0.9"
                  />
                </g>
              )}
              {(dart.phase === 'stuck' || dart.phase === 'fading') && (
                <g className={dart.phase === 'fading' ? 'animate-dart-fade' : ''}>
                  {/* Impact ring */}
                  <circle
                    cx={dart.x}
                    cy={dart.y}
                    r={dart.phase === 'stuck' ? 6 : 10}
                    fill="none"
                    stroke="hsl(45, 90%, 55%)"
                    strokeWidth="2"
                    opacity={dart.phase === 'stuck' ? 0.8 : 0.3}
                    style={{ transition: 'all 0.3s ease' }}
                  />
                  {/* Stuck dart (shorter, angled) */}
                  <line
                    x1={dart.x - 2}
                    y1={dart.y + 18}
                    x2={dart.x + 1}
                    y2={dart.y - 3}
                    stroke="hsl(0, 0%, 75%)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity={dart.phase === 'fading' ? 0.3 : 1}
                  />
                  <line
                    x1={dart.x + 1}
                    y1={dart.y - 3}
                    x2={dart.x + 2}
                    y2={dart.y - 8}
                    stroke="hsl(0, 0%, 90%)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    opacity={dart.phase === 'fading' ? 0.3 : 1}
                  />
                  {/* Mini flights */}
                  <polygon
                    points={`${dart.x - 2},${dart.y + 14} ${dart.x - 7},${dart.y + 22} ${dart.x - 2},${dart.y + 17}`}
                    fill="hsl(0, 70%, 50%)"
                    opacity={dart.phase === 'fading' ? 0.2 : 0.8}
                  />
                  <polygon
                    points={`${dart.x - 2},${dart.y + 14} ${dart.x + 4},${dart.y + 22} ${dart.x - 1},${dart.y + 17}`}
                    fill="hsl(0, 70%, 40%)"
                    opacity={dart.phase === 'fading' ? 0.2 : 0.8}
                  />
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default Dartboard;
