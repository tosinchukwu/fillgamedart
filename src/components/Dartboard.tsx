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

interface DartStuck {
  id: number;
  x: number;
  y: number;
  playerIdx: number;
}

let dartIdCounter = 0;

type BoardPhase = 'idle' | 'throwing';

const Dartboard: React.FC<DartboardProps> = ({ gameState, onHitNumber, onHitRing, disabled }) => {
  const cp = gameState.currentPlayer;
  const player = gameState.players[cp];

  const [boardPhase, setBoardPhase] = useState<BoardPhase>('idle');
  const [stuckDarts, setStuckDarts] = useState<DartStuck[]>([]);
  const [dartVisible, setDartVisible] = useState(true);
  const [dartFlying, setDartFlying] = useState(false);

  const phaseRef = useRef<BoardPhase>('idle');
  useEffect(() => { phaseRef.current = boardPhase; }, [boardPhase]);

  const prevCpRef = useRef(cp);
  useEffect(() => {
    if (prevCpRef.current !== cp) {
      // Darts persist until the new player takes their first action
      prevCpRef.current = cp;
    }
  }, [cp]);

  const resolveDartLanding = useCallback(() => {
    // 1. Choose a target: 70% chance for a number, 30% for a ring line
    const hitNumberMode = Math.random() < 0.7;

    if (hitNumberMode) {
      // Pick a random number from layout
      const targetPos = BOARD_LAYOUT[Math.floor(Math.random() * BOARD_LAYOUT.length)];
      const ring = RING_RADII[targetPos.ring];
      const r = ring.outer; // Darts land near the dot on the outer ring line
      const [lx, ly] = polarToXY(targetPos.angle, r);

      return {
        lx: lx + (Math.random() - 0.5) * 10,
        ly: ly + (Math.random() - 0.5) * 10,
        hitRingIdx: targetPos.ring,
        closestNum: targetPos.number,
        hitRingLine: false,
        hitRingLineIdx: -1
      };
    } else {
      // Pick a random ring line
      const ringIdx = Math.floor(Math.random() * RING_RADII.length);
      const ring = RING_RADII[ringIdx];
      const landAngle = Math.random() * 360;
      const [lx, ly] = polarToXY(landAngle, ring.outer);

      return {
        lx, ly,
        hitRingIdx: ringIdx,
        closestNum: -1,
        hitRingLine: true,
        hitRingLineIdx: ringIdx
      };
    }
  }, []);

  const handleDartArrowClick = useCallback(() => {
    setBoardPhase('throwing');
    phaseRef.current = 'throwing';

    // Clear previous player's darts on the current player's first throw
    if (gameState.dartsRemaining === 3) {
      setStuckDarts([]);
    }

    const { lx, ly, hitRingIdx, closestNum, hitRingLine, hitRingLineIdx } = resolveDartLanding();

    setDartFlying(true);
    setDartVisible(false);

    setTimeout(() => {
      setDartFlying(false);
      setDartVisible(true);
      setBoardPhase('idle');
      phaseRef.current = 'idle';

      const id = ++dartIdCounter;
      // Single-dart visibility: only keep the most recent dart
      setStuckDarts([{ id, x: lx, y: ly, playerIdx: cp }]);
      // Permanent markers: do not remove them after 2.5s

      if (hitRingLine && hitRingLineIdx >= 0) {
        const rNums = RING_NUMBERS[hitRingLineIdx] ?? [];
        if (rNums.length > 0) onHitRing(hitRingLineIdx);
      } else if (closestNum !== -1) {
        if (!gameState.closedNumbers.has(closestNum) && !player.completed[closestNum]) {
          onHitNumber(closestNum);
        } else {
          const rNums = RING_NUMBERS[hitRingIdx] ?? [];
          if (rNums.length > 0) onHitRing(hitRingIdx);
        }
      }
    }, 560);
  }, [disabled, gameState.gameOver, gameState.closedNumbers, boardPhase, player, onHitNumber, onHitRing, resolveDartLanding]);

  useEffect(() => {
    const handleGlobalThrow = () => {
      handleDartArrowClick();
    };
    window.addEventListener('THROW_DART', handleGlobalThrow);
    return () => window.removeEventListener('THROW_DART', handleGlobalThrow);
  }, [handleDartArrowClick]);

  const getHint = () => {
    if (disabled) return 'GAME PAUSED';
    if (boardPhase === 'idle') return 'Click arrow to throw dart';
    if (boardPhase === 'throwing') return 'Dart in flight...';
    return '';
  };

  const ringColors = [
    'var(--ring-1)',
    'var(--ring-2)',
    'var(--ring-3)',
    'var(--ring-4)',
  ];

  return (
    <div className="relative flex flex-col items-center gap-10">
      <div className="flex flex-col items-center justify-center gap-10">
        {/* ═══ CENTER: Dartboard ═══ */}
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 500 500"
            className="w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] md:w-[450px] md:h-[450px]"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(0,0,0,0.5))',
              pointerEvents: 'none',
              overflow: 'visible'
            }}
          >
            <defs>
              <radialGradient id="hole-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#000" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0a0a14" stopOpacity="0.3" />
              </radialGradient>
              <radialGradient id="gem-red" cx="40%" cy="35%" r="50%">
                <stop offset="0%" stopColor="#ff4d4d" />
                <stop offset="100%" stopColor="#800000" />
              </radialGradient>
              <radialGradient id="gem-green" cx="40%" cy="35%" r="50%">
                <stop offset="0%" stopColor="#4dffb5" />
                <stop offset="100%" stopColor="#00663d" />
              </radialGradient>
              <radialGradient id="gem-gray" cx="40%" cy="35%" r="50%">
                <stop offset="0%" stopColor="#a0a0a0" />
                <stop offset="100%" stopColor="#202020" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Golden Base background */}
            <circle cx={CENTER} cy={CENTER} r="255" fill="#C5A059" opacity="1.0" />
            <circle cx={CENTER} cy={CENTER} r="248" fill="none" stroke="#B08D43" strokeWidth="6" />

            {/* Dartboard Slices */}
            {Array.from({ length: 20 }).map((_, i) => {
              const startAngle = (i * 18 - 9 - 90) * Math.PI / 180;
              const endAngle = ((i + 1) * 18 - 9 - 90) * Math.PI / 180;
              const x1 = CENTER + 245 * Math.cos(startAngle);
              const y1 = CENTER + 245 * Math.sin(startAngle);
              const x2 = CENTER + 245 * Math.cos(endAngle);
              const y2 = CENTER + 245 * Math.sin(endAngle);

              // Alternate colors for the slices
              const sliceColor = i % 2 === 0 ? "rgba(0,0,0,0.8)" : "rgba(240,240,230,0.1)";

              return (
                <path
                  key={`slice-${i}`}
                  d={`M ${CENTER} ${CENTER} L ${x1} ${y1} A 245 245 0 0 1 ${x2} ${y2} Z`}
                  fill={sliceColor}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Energy Rings - Now Solid White Lines */}
            {[...RING_RADII].map((ring, i) => (
              <circle
                key={`ring-line-${i}`}
                cx={CENTER} cy={CENTER}
                r={ring.outer * SCALE}
                fill="none"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="5"
              />
            ))}

            {/* Gem Number Dots */}
            {BOARD_LAYOUT.map((pos) => {
              const ringData = RING_RADII[pos.ring];
              const r = ringData.outer;
              const [x, y] = polarToXY(pos.angle, r);
              const isClosed = gameState.closedNumbers.has(pos.number);

              const gemId = isClosed ? 'gem-gray' : pos.color === 'red' ? 'gem-red' : 'gem-green';
              const DOT_R = 19;

              return (
                <g key={pos.number}>
                  {/* Badge Circle - White background for numbers */}
                  <circle
                    cx={x} cy={y} r="20"
                    fill="white"
                    opacity="0.9"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                  />

                  {/* Number text - Fancy, bold, high-contrast */}
                  <text
                    x={x}
                    y={y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isClosed ? "#888" : pos.color === 'red' ? '#e63946' : '#2a9d8f'}
                    fontSize="24"
                    fontWeight="900"
                    fontFamily="'Playfair Display', serif"
                  >
                    {pos.number}
                  </text>
                </g>
              );
            })}

            {/* Stuck dart impact spots - Permanent Image Markers */}
            {stuckDarts.map((dart) => (
              <g key={dart.id}>
                <image
                  href={dart.playerIdx === 0 ? "/green_dart.png" : "/red_dart.png"}
                  x={dart.x - 40}
                  y={dart.y - 160}
                  width="80"
                  height="160"
                />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Mission log hint */}
      {/* Game hint */}
      <div className="text-center glass-panel px-8 py-3 rounded-full border-white/5 min-w-[300px]">
        <span className="text-xs tracking-[0.3em] font-mono font-bold uppercase"
          style={{ color: 'var(--theme-accent)' }}>
          {getHint()}
        </span>
      </div>
    </div>
  );
};

// ─── Dart Arrow Component ───────────────────────────────────────────────────
export const DartArrow: React.FC<{
  boardPhase: string;
  isFlying: boolean;
  isVisible: boolean;
  disabled: boolean;
  onClick: () => void;
  playerIdx: number;
}> = ({ boardPhase, isFlying, isVisible, disabled, onClick, playerIdx }) => {
  const canClick = boardPhase === 'idle' && !disabled;

  return (
    <div
      onClick={canClick ? onClick : undefined}
      style={{ cursor: canClick ? 'pointer' : 'default' }}
      className={`
        transition-all duration-300 select-none group
        ${!isVisible ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}
        ${isFlying ? 'translate-x-[200px] translate-y-[100px] rotate-[60deg] opacity-0 duration-500 ease-in' : ''}
        ${canClick ? 'hover:scale-110 active:scale-90' : ''}
      `}
    >
      <div className="relative" onClick={(e) => {
        e.stopPropagation();
        if (canClick) {
          console.log("Dispatching THROW_DART from DartArrow image");
          window.dispatchEvent(new CustomEvent('THROW_DART'));
        }
      }}>
        <img
          src={playerIdx === 0 ? "/green_dart.png" : "/red_dart.png"}
          alt="Dart arrow"
          className="w-[100px] md:w-[130px] rounded"
        />
      </div>
    </div>
  );
};

export default Dartboard;
