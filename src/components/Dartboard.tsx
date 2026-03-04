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
  angle: number;
  tilt: number;
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
  const [hitPulse, setHitPulse] = useState<{ id: string; type: 'number' | 'ring' } | null>(null);

  const phaseRef = useRef<BoardPhase>('idle');
  useEffect(() => { phaseRef.current = boardPhase; }, [boardPhase]);

  // Sync stuck darts with game state resets
  useEffect(() => {
    const totalHits = Object.values(gameState.hitSequences).reduce((acc, seq) => acc + seq.length, 0);
    if (totalHits === 0 && stuckDarts.length > 0) {
      setStuckDarts([]);
    }
  }, [gameState.hitSequences]);

  const prevCpRef = useRef(cp);
  useEffect(() => {
    if (prevCpRef.current !== cp) {
      // Darts persist until the new player takes their first action
      prevCpRef.current = cp;
    }
  }, [cp]);

  const resolveDartLanding = useCallback(() => {
    // Random Mode (original behavior)
    const hitNumberMode = Math.random() < 0.7;
    if (hitNumberMode) {
      const targetPos = BOARD_LAYOUT[Math.floor(Math.random() * BOARD_LAYOUT.length)];
      const ring = RING_RADII[targetPos.ring];
      const r = ring.outer;
      const [lx, ly] = polarToXY(targetPos.angle, r);
      return {
        lx, ly, angle: targetPos.angle, hitRingIdx: targetPos.ring,
        closestNum: targetPos.number, hitRingLine: false, hitRingLineIdx: -1
      };
    } else {
      const ringIdx = Math.floor(Math.random() * RING_RADII.length);
      const ring = RING_RADII[ringIdx];
      const landAngle = Math.random() * 360;
      const r = ring.outer;
      const [lx, ly] = polarToXY(landAngle, r);
      return {
        lx, ly, angle: landAngle, hitRingIdx: ringIdx,
        closestNum: -1, hitRingLine: true, hitRingLineIdx: ringIdx
      };
    }
  }, []);

  const handleDartArrowClick = useCallback(() => {
    if (disabled || gameState.gameOver || phaseRef.current === 'throwing') return;

    setBoardPhase('throwing');
    phaseRef.current = 'throwing';

    if (gameState.dartsRemaining === 3) {
      setStuckDarts([]);
    }

    const res = resolveDartLanding();
    const { lx, ly, angle, hitRingIdx, closestNum, hitRingLine, hitRingLineIdx } = res;

    setDartFlying(true);
    setDartVisible(false);

    setTimeout(() => {
      setDartFlying(false);
      setDartVisible(true);
      setBoardPhase('idle');
      phaseRef.current = 'idle';
      window.dispatchEvent(new CustomEvent('DART_HIT_IMPACT'));

      const id = ++dartIdCounter;
      const tilt = (Math.random() - 0.5) * 40;
      setStuckDarts([{ id, x: lx, y: ly, angle, tilt, playerIdx: cp }]);

      if (hitRingLine && hitRingLineIdx >= 0) {
        setHitPulse({ id: `ring-${hitRingLineIdx}`, type: 'ring' });
        const rNums = RING_NUMBERS[hitRingLineIdx] ?? [];
        if (rNums.length > 0) onHitRing(hitRingLineIdx);
      } else if (closestNum !== -1) {
        setHitPulse({ id: `num-${closestNum}`, type: 'number' });
        if (!gameState.closedNumbers.has(closestNum)) {
          onHitNumber(closestNum);
        } else {
          const rNums = RING_NUMBERS[hitRingIdx] ?? [];
          if (rNums.length > 0) onHitRing(hitRingIdx);
        }
      }
      setTimeout(() => setHitPulse(null), 1000);
    }, 560);
  }, [disabled, gameState.gameOver, gameState.closedNumbers, gameState.dartsRemaining, cp, onHitNumber, onHitRing, resolveDartLanding]);

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


  return (
    <div className="relative flex flex-col items-center gap-10">
      <div className="flex flex-col items-center justify-center gap-10">
        {/* ═══ CENTER: Dartboard ═══ */}
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 500 500"
            className="w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] md:w-[450px] md:h-[450px]"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(0,0,0,0.5))',
              pointerEvents: 'none',
              overflow: 'visible'
            }}
          >
            <defs>
              {/* Ruby Crystal Gradient */}
              <radialGradient id="ruby-grad" cx="35%" cy="35%" r="65%" fx="25%" fy="25%">
                <stop offset="0%" stopColor="#FF4D4D" />
                <stop offset="40%" stopColor="#B30000" />
                <stop offset="100%" stopColor="#4D0000" />
              </radialGradient>
              {/* Emerald Crystal Gradient */}
              <radialGradient id="emerald-grad" cx="35%" cy="35%" r="65%" fx="25%" fy="25%">
                <stop offset="0%" stopColor="#4DFF4D" />
                <stop offset="40%" stopColor="#00B300" />
                <stop offset="100%" stopColor="#004D00" />
              </radialGradient>
              <filter id="inner-glow">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="crystal-shine">
                <feGaussianBlur stdDeviation="0.4" result="blur" />
              </filter>
            </defs>

            {/* Royal Blue Base background */}
            <circle cx={CENTER} cy={CENTER} r="255" fill="#002366" opacity="1.0" />
            <circle cx={CENTER} cy={CENTER} r="248" fill="none" stroke="#4169E1" strokeWidth="8" />

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
                stroke={hitPulse?.type === 'ring' && hitPulse.id === `ring-${i}` ? "#FFFFFF" : "rgba(255,255,255,0.8)"}
                strokeWidth={hitPulse?.type === 'ring' && hitPulse.id === `ring-${i}` ? "8" : "4"}
                className={hitPulse?.type === 'ring' && hitPulse.id === `ring-${i}` ? "animate-pulse" : ""}
                style={{ transition: 'stroke-width 0.2s' }}
                filter="url(#glow)"
              />
            ))}

            {/* Gem Number Dots */}
            {BOARD_LAYOUT.map((pos) => {
              const ringData = RING_RADII[pos.ring];
              // Render numbers EXACTLY on the white ring circle
              const r = ringData.outer;
              const [x, y] = polarToXY(pos.angle, r);
              const isClosed = gameState.closedNumbers.has(pos.number);

              const gemId = isClosed ? 'gem-gray' : pos.color === 'red' ? 'gem-red' : 'gem-green';
              const DOT_R = 19;

              return (
                <g key={pos.number}>
                  {/* Exquisite Image Badge */}
                  <circle
                    cx={x} cy={y} r={hitPulse?.id === `num-${pos.number}` ? "26" : "21"}
                    fill={isClosed ? "#333" : (pos.color === 'red' ? 'url(#ruby-grad)' : 'url(#emerald-grad)')}
                    filter="url(#glow)"
                    className={hitPulse?.id === `num-${pos.number}` ? "animate-pulse" : ""}
                    style={{ transition: 'all 0.2s ease-out' }}
                  />


                  {/* Restored Hit Progress Ring - Now tracks current player's contributions to communal sequence */}
                  {!isClosed && gameState.hitSequences[pos.number].filter(p => p === cp).length > 0 && (
                    <circle
                      cx={x} cy={y} r="26"
                      fill="none"
                      stroke={pos.color === 'red' ? '#e63946' : '#2a9d8f'}
                      strokeWidth="4"
                      strokeDasharray={`${(Math.min(gameState.hitSequences[pos.number].filter(p => p === cp).length / pos.number, 1)) * (2 * Math.PI * 26)} ${2 * Math.PI * 26}`}
                      transform={`rotate(-90 ${x} ${y})`}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Number text - Fancy Playfair serif */}
                  <text
                    x={x}
                    y={y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isClosed ? "#888" : "#FFFFFF"}
                    fontSize="22"
                    fontWeight="800"
                    fontFamily="'Orbitron', sans-serif"
                    style={{
                      textShadow: isClosed
                        ? 'none'
                        : `0 2px 4px rgba(0, 0, 0, 0.4)`
                    }}
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
                  x={dart.x - 29}
                  y={dart.y - 135 + 15}
                  width="58"
                  height="135"
                  transform={`rotate(${dart.angle + dart.tilt} ${dart.x} ${dart.y})`}
                  style={{ filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.6))' }}
                />
              </g>
            ))}

          </svg>
        </div>
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
        ${isFlying ? 'translate-x-[200px] translate-y-[-300px] rotate-[-45deg] opacity-0 duration-500 ease-in' : ''}
        ${canClick ? 'hover:scale-110 active:scale-90' : ''}
      `}
    >
      <div className="relative" onClick={(e) => {
        e.stopPropagation();
        if (canClick) {
          window.dispatchEvent(new CustomEvent('THROW_DART'));
        }
      }}>
        <img
          src={playerIdx === 0 ? "/green_dart.png" : "/red_dart.png"}
          alt="Dart arrow"
          className="w-[80px] md:w-[100px] rotate-[180deg] drop-shadow-lg"
        />
      </div>
    </div>
  );
};

export default Dartboard;
