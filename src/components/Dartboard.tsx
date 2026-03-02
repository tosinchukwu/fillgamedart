import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BOARD_LAYOUT, RING_RADII, RING_NUMBERS } from '../game/boardLayout';
import { GameState } from '../game/gameLogic';

interface DartboardProps {
  gameState: GameState;
  onHitNumber: (num: number) => void;
  onHitRing: (ringIndex: number) => void;
  disabled: boolean;
}

const CENTER = 250;
const SCALE = 1.0;

function polarToXY(angle: number, radius: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad) * SCALE, CENTER + radius * Math.sin(rad) * SCALE];
}

interface DartAnimation {
  id: number;
  targetX: number;
  targetY: number;
  phase: 'flying' | 'stuck' | 'fading';
}

let dartIdCounter = 0;

// Neon ring colors
const RING_COLORS = [
  { fill: 'hsl(220, 80%, 35%)', stroke: 'hsl(200, 90%, 55%)', glow: 'hsl(200, 90%, 60%)' }, // outer - blue
  { fill: 'hsl(0, 65%, 45%)', stroke: 'hsl(25, 90%, 55%)', glow: 'hsl(25, 90%, 60%)' },     // mid-outer - red/orange
  { fill: 'hsl(270, 60%, 40%)', stroke: 'hsl(200, 90%, 55%)', glow: 'hsl(200, 90%, 60%)' },  // mid-inner - purple/blue
  { fill: 'hsl(0, 65%, 45%)', stroke: 'hsl(25, 90%, 55%)', glow: 'hsl(25, 90%, 60%)' },      // inner - red/orange
];

const SEGMENT_COUNT = 14;

const Dartboard: React.FC<DartboardProps> = ({ gameState, onHitNumber, onHitRing, disabled }) => {
  const cp = gameState.currentPlayer;
  const player = gameState.players[cp];
  const [darts, setDarts] = useState<DartAnimation[]>([]);
  const boardRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setDarts(prev => prev.filter(d => d.phase !== 'fading'));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const throwDart = useCallback((tx: number, ty: number, callback: () => void) => {
    const id = ++dartIdCounter;
    setDarts(prev => [...prev, { id, targetX: tx, targetY: ty, phase: 'flying' }]);
    
    setTimeout(() => {
      setDarts(prev => prev.map(d => d.id === id ? { ...d, phase: 'stuck' } : d));
      callback();
      setTimeout(() => {
        setDarts(prev => prev.map(d => d.id === id ? { ...d, phase: 'fading' } : d));
      }, 1200);
    }, 500);
  }, []);

  const handleHitNumber = useCallback((num: number, x: number, y: number) => {
    if (disabled) return;
    if (gameState.closedNumbers.has(num)) return;
    throwDart(x, y, () => onHitNumber(num));
  }, [disabled, gameState.closedNumbers, onHitNumber, throwDart]);

  const handleHitRing = useCallback((ringIndex: number, x: number, y: number) => {
    if (disabled) return;
    const nums = RING_NUMBERS[ringIndex];
    if (!nums || nums.length === 0) return;
    throwDart(x, y, () => onHitRing(ringIndex));
  }, [disabled, onHitRing, throwDart]);

  // Generate segment paths for the neon dartboard
  const segmentAngle = 360 / SEGMENT_COUNT;

  return (
    <div className="relative flex flex-col items-center" style={{ minHeight: '580px' }}>
      {/* Dartboard */}
      <div className="relative">
        <svg
          ref={boardRef}
          viewBox="0 0 500 500"
          className="w-[340px] h-[340px] md:w-[400px] md:h-[400px]"
          style={{ filter: 'drop-shadow(0 0 30px hsl(200 90% 50% / 0.3))' }}
        >
          <defs>
            <radialGradient id="boardBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(270, 50%, 25%)" />
              <stop offset="100%" stopColor="hsl(220, 40%, 12%)" />
            </radialGradient>
            <filter id="neonGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="strongGlow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer board circle */}
          <circle cx={CENTER} cy={CENTER} r={235} fill="hsl(220, 30%, 8%)" stroke="hsl(0, 0%, 40%)" strokeWidth="3" />
          <circle cx={CENTER} cy={CENTER} r={232} fill="url(#boardBg)" stroke="hsl(200, 80%, 50%)" strokeWidth="1.5" opacity="0.6" />

          {/* Ring segments with alternating colors */}
          {RING_RADII.map((ring, ringIdx) => {
            if (ringIdx === 3) {
              // Bullseye
              return (
                <g key={`ring-${ringIdx}`}>
                  <circle cx={CENTER} cy={CENTER} r={ring.outer * SCALE} fill="hsl(0, 65%, 45%)" stroke="hsl(25, 90%, 55%)" strokeWidth="2" filter="url(#neonGlow)" />
                  <circle cx={CENTER} cy={CENTER} r={25 * SCALE} fill="hsl(25, 90%, 55%)" stroke="hsl(45, 100%, 60%)" strokeWidth="2" filter="url(#strongGlow)" />
                  <circle cx={CENTER} cy={CENTER} r={10 * SCALE} fill="hsl(45, 100%, 60%)" filter="url(#strongGlow)" />
                </g>
              );
            }

            const inner = ring.inner * SCALE;
            const outer = ring.outer * SCALE;

            return (
              <g key={`ring-${ringIdx}`}>
                {Array.from({ length: SEGMENT_COUNT }, (_, segIdx) => {
                  const startAngle = segIdx * segmentAngle - 90 - segmentAngle / 2;
                  const endAngle = startAngle + segmentAngle;
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;

                  const x1o = CENTER + outer * Math.cos(startRad);
                  const y1o = CENTER + outer * Math.sin(startRad);
                  const x2o = CENTER + outer * Math.cos(endRad);
                  const y2o = CENTER + outer * Math.sin(endRad);
                  const x1i = CENTER + inner * Math.cos(endRad);
                  const y1i = CENTER + inner * Math.sin(endRad);
                  const x2i = CENTER + inner * Math.cos(startRad);
                  const y2i = CENTER + inner * Math.sin(startRad);

                  const colorIdx = (ringIdx + segIdx) % 2;
                  const colors = colorIdx === 0 ? RING_COLORS[0] : RING_COLORS[1];

                  const path = `M ${x1o} ${y1o} A ${outer} ${outer} 0 0 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${inner} ${inner} 0 0 0 ${x2i} ${y2i} Z`;

                  return (
                    <path
                      key={`seg-${ringIdx}-${segIdx}`}
                      d={path}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth="0.8"
                      opacity="0.85"
                    />
                  );
                })}

                {/* Ring boundary glow line */}
                <circle
                  cx={CENTER} cy={CENTER} r={outer}
                  fill="none" stroke={RING_COLORS[ringIdx].glow} strokeWidth="1.5" opacity="0.5"
                  filter="url(#neonGlow)"
                />
              </g>
            );
          })}

          {/* Radial divider lines */}
          {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
            const angle = i * segmentAngle - 90 - segmentAngle / 2;
            const rad = (angle * Math.PI) / 180;
            const outerR = RING_RADII[0].outer * SCALE;
            const innerR = RING_RADII[3].outer * SCALE;
            return (
              <line
                key={`div-${i}`}
                x1={CENTER + innerR * Math.cos(rad)}
                y1={CENTER + innerR * Math.sin(rad)}
                x2={CENTER + outerR * Math.cos(rad)}
                y2={CENTER + outerR * Math.sin(rad)}
                stroke="hsl(200, 80%, 55%)"
                strokeWidth="0.8"
                opacity="0.4"
              />
            );
          })}

          {/* Ring click zones (invisible) */}
          {RING_RADII.map((ring, i) => {
            const avgR = ((ring.inner + ring.outer) / 2) * SCALE;
            const thickness = (ring.outer - ring.inner) * SCALE * 0.6;
            return (
              <circle
                key={`ring-click-${i}`}
                cx={CENTER} cy={CENTER} r={avgR}
                fill="transparent" stroke="transparent" strokeWidth={thickness}
                style={{ pointerEvents: 'stroke' }}
                className={!disabled ? 'cursor-pointer' : ''}
                onClick={(e) => {
                  e.stopPropagation();
                  const svg = e.currentTarget.ownerSVGElement;
                  if (!svg) return;
                  const rect = svg.getBoundingClientRect();
                  const px = ((e.clientX - rect.left) / rect.width) * 500;
                  const py = ((e.clientY - rect.top) / rect.height) * 500;
                  handleHitRing(i, px, py);
                }}
              />
            );
          })}

          {/* Number labels around the board */}
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
                className={!disabled && !isClosed ? 'cursor-pointer' : ''}
              >
                <circle cx={x} cy={y} r={20} fill="transparent" />

                {/* Progress ring */}
                <circle
                  cx={x} cy={y} r={17}
                  fill="none"
                  stroke={isCompleted ? 'hsl(145, 70%, 55%)' : 'hsl(200, 60%, 40%)'}
                  strokeWidth="2.5"
                  strokeDasharray={`${Math.min(progress, 1) * 106.8} 106.8`}
                  transform={`rotate(-90 ${x} ${y})`}
                  style={{ transition: 'stroke-dasharray 0.4s ease' }}
                  filter="url(#neonGlow)"
                />

                {/* Number bg */}
                <circle
                  cx={x} cy={y} r={14}
                  fill={
                    isClosed ? 'hsl(220, 15%, 10%)' :
                    isCompleted ? 'hsl(145, 50%, 18%)' :
                    'hsl(220, 25%, 10%)'
                  }
                  fillOpacity="0.9"
                  stroke={
                    isClosed ? 'hsl(220, 10%, 25%)' :
                    isCompleted ? 'hsl(145, 70%, 55%)' :
                    'hsl(200, 60%, 50%)'
                  }
                  strokeWidth="1.5"
                />

                {/* Number text */}
                <text
                  x={x} y={y + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fill={
                    isClosed ? 'hsl(220, 10%, 35%)' :
                    isCompleted ? 'hsl(145, 70%, 75%)' :
                    'hsl(0, 0%, 95%)'
                  }
                  fontSize="12" fontWeight="bold"
                  fontFamily="'Bebas Neue', sans-serif"
                  className="pointer-events-none select-none"
                >
                  {pos.number}
                </text>

                {/* Hit badge */}
                {player.hits[pos.number] > 0 && !isClosed && (
                  <g className="pointer-events-none">
                    <rect x={x - 11} y={y - 28} width={22} height={13} rx={3}
                      fill="hsl(220, 25%, 8%)" fillOpacity="0.95"
                      stroke="hsl(45, 90%, 55%)" strokeWidth="0.8"
                    />
                    <text x={x} y={y - 21} textAnchor="middle" dominantBaseline="central"
                      fill="hsl(45, 90%, 55%)" fontSize="7.5" fontWeight="bold"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {player.hits[pos.number]}/{pos.number}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Dart impact animations */}
          {darts.map((dart) => (
            <g key={dart.id}>
              {dart.phase === 'stuck' && (
                <g>
                  <circle cx={dart.targetX} cy={dart.targetY} r={8}
                    fill="none" stroke="hsl(45, 90%, 55%)" strokeWidth="2"
                    opacity="0.8" filter="url(#strongGlow)"
                  />
                  <circle cx={dart.targetX} cy={dart.targetY} r={3}
                    fill="hsl(45, 90%, 60%)" filter="url(#strongGlow)"
                  />
                </g>
              )}
              {dart.phase === 'fading' && (
                <g className="animate-dart-fade">
                  <circle cx={dart.targetX} cy={dart.targetY} r={12}
                    fill="none" stroke="hsl(45, 90%, 55%)" strokeWidth="1.5" opacity="0.4"
                  />
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Space between board and dart */}
      <div className="h-8 md:h-12" />

      {/* Big Dart Arrow */}
      <DartArrow
        isFlying={darts.some(d => d.phase === 'flying')}
        disabled={disabled}
      />
    </div>
  );
};

// Separate big dart arrow component
const DartArrow: React.FC<{ isFlying: boolean; disabled: boolean }> = ({ isFlying, disabled }) => {
  return (
    <div className={`transition-all duration-500 ${isFlying ? 'animate-dart-throw' : ''}`}>
      <svg viewBox="0 0 80 200" className="w-16 h-40 md:w-20 md:h-48" style={{ filter: 'drop-shadow(0 0 12px hsl(200 80% 50% / 0.4))' }}>
        {/* Dart tip (needle) */}
        <line x1="40" y1="0" x2="40" y2="35" stroke="hsl(0, 0%, 85%)" strokeWidth="2" strokeLinecap="round" />
        <line x1="40" y1="0" x2="40" y2="10" stroke="hsl(0, 0%, 95%)" strokeWidth="1.5" strokeLinecap="round" />

        {/* Dart barrel */}
        <rect x="35" y="35" width="10" height="55" rx="3" fill="hsl(220, 20%, 35%)" stroke="hsl(200, 60%, 50%)" strokeWidth="1" />
        {/* Grip rings */}
        {[42, 50, 58, 66, 74].map(y => (
          <line key={y} x1="35" y1={y} x2="45" y2={y} stroke="hsl(200, 80%, 60%)" strokeWidth="1" opacity="0.7" />
        ))}
        {/* Barrel highlight */}
        <rect x="37" y="36" width="3" height="53" rx="1" fill="hsl(200, 60%, 55%)" opacity="0.3" />

        {/* Dart shaft */}
        <rect x="38" y="90" width="4" height="50" rx="1" fill="hsl(220, 15%, 25%)" stroke="hsl(0, 0%, 40%)" strokeWidth="0.5" />

        {/* Flights (fins) */}
        <polygon points="40,130 20,175 40,160" fill="hsl(340, 80%, 50%)" stroke="hsl(340, 90%, 60%)" strokeWidth="0.8" opacity="0.9" />
        <polygon points="40,130 60,175 40,160" fill="hsl(200, 80%, 45%)" stroke="hsl(200, 90%, 60%)" strokeWidth="0.8" opacity="0.9" />
        {/* Flight center line */}
        <line x1="40" y1="130" x2="40" y2="175" stroke="hsl(0, 0%, 50%)" strokeWidth="1" />

        {/* Flight pattern detail */}
        <polygon points="40,135 25,165 40,152" fill="hsl(340, 70%, 40%)" opacity="0.6" />
        <polygon points="40,135 55,165 40,152" fill="hsl(200, 70%, 35%)" opacity="0.6" />

        {/* Glow effect at tip */}
        {!disabled && (
          <circle cx="40" cy="2" r="4" fill="hsl(200, 90%, 60%)" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </div>
  );
};

export default Dartboard;
