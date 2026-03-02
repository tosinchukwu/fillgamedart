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
}

let dartIdCounter = 0;

type BoardPhase = 'idle' | 'rotating' | 'throwing';

const Dartboard: React.FC<DartboardProps> = ({ gameState, onHitNumber, onHitRing, disabled }) => {
  const cp = gameState.currentPlayer;
  const player = gameState.players[cp];

  const [boardPhase, setBoardPhase] = useState<BoardPhase>('idle');
  const [rotationDeg, setRotationDeg] = useState(0);
  const [stuckDarts, setStuckDarts] = useState<DartStuck[]>([]);
  const [dartVisible, setDartVisible] = useState(true);
  const [dartFlying, setDartFlying] = useState(false);

  const rotAnimRef = useRef<number | null>(null);
  const rotDegRef = useRef(0);
  const phaseRef = useRef<BoardPhase>('idle');

  useEffect(() => { phaseRef.current = boardPhase; }, [boardPhase]);

  const prevCpRef = useRef(cp);
  useEffect(() => {
    if (prevCpRef.current !== cp) {
      setStuckDarts([]);
      setBoardPhase('idle');
      prevCpRef.current = cp;
    }
  }, [cp]);

  useEffect(() => {
    return () => { if (rotAnimRef.current) cancelAnimationFrame(rotAnimRef.current); };
  }, []);

  const resolveDartLanding = useCallback(() => {
    const landAngle = Math.random() * 360;
    const weights = [0.15, 0.3, 0.35, 0.2];
    const roll = Math.random();
    let cumulative = 0;
    let hitRingIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (roll < cumulative) { hitRingIdx = i; break; }
    }

    const ring = RING_RADII[hitRingIdx];
    const landRadius = ring.inner + Math.random() * (ring.outer - ring.inner);
    const rad = ((landAngle - 90) * Math.PI) / 180;
    const lx = CENTER + landRadius * Math.cos(rad) * SCALE;
    const ly = CENTER + landRadius * Math.sin(rad) * SCALE;

    let closestNum = -1;
    let closestDist = Infinity;
    BOARD_LAYOUT.forEach((pos) => {
      if (pos.ring !== hitRingIdx) return;
      // Dot is placed exactly ON the outer ring boundary
      const r = RING_RADII[pos.ring].outer;
      const [nx, ny] = polarToXY(pos.angle, r);
      const d = Math.sqrt((lx - nx) ** 2 + (ly - ny) ** 2);
      if (d < closestDist) {
        closestDist = d;
        closestNum = pos.number;
      }
    });

    const ringBoundaryDist = Math.min(
      Math.abs(landRadius - ring.inner),
      Math.abs(landRadius - ring.outer)
    );
    const hitRingLine = ringBoundaryDist < 14;

    return { lx, ly, hitRingIdx, closestNum, hitRingLine, hitRingLineIdx: hitRingLine ? hitRingIdx : -1 };
  }, []);

  const handleDartArrowClick = useCallback(() => {
    if (disabled || gameState.gameOver) return;

    if (boardPhase === 'idle') {
      setBoardPhase('rotating');
      phaseRef.current = 'rotating';

      const spinMs = (5 + Math.random() * 2) * 1000;
      const fps = 60;
      const totalFrames = Math.round((spinMs / 1000) * fps);
      let frame = 0;

      const animate = () => {
        if (phaseRef.current !== 'rotating') return;
        frame++;
        const t = frame / totalFrames;
        const speed = 9 - t * 7;
        rotDegRef.current = (rotDegRef.current + Math.max(speed, 2)) % 360;
        setRotationDeg(rotDegRef.current);

        if (frame < totalFrames) {
          rotAnimRef.current = requestAnimationFrame(animate);
        }
      };
      rotAnimRef.current = requestAnimationFrame(animate);
      return;
    }

    if (boardPhase === 'rotating') {
      if (rotAnimRef.current) {
        cancelAnimationFrame(rotAnimRef.current);
        rotAnimRef.current = null;
      }
      setBoardPhase('throwing');
      phaseRef.current = 'throwing';

      const { lx, ly, hitRingIdx, closestNum, hitRingLine, hitRingLineIdx } = resolveDartLanding();

      setDartFlying(true);
      setDartVisible(false);

      setTimeout(() => {
        setDartFlying(false);
        setDartVisible(true);
        setBoardPhase('idle');
        phaseRef.current = 'idle';

        const id = ++dartIdCounter;
        setStuckDarts(prev => [...prev, { id, x: lx, y: ly }]);
        setTimeout(() => setStuckDarts(prev => prev.filter(d => d.id !== id)), 2500);

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
    }
  }, [disabled, gameState.gameOver, gameState.closedNumbers, boardPhase, player, onHitNumber, onHitRing, resolveDartLanding]);

  const getHint = () => {
    if (disabled) return 'Game Over';
    if (boardPhase === 'idle') return 'Click arrow to spin the board';
    if (boardPhase === 'rotating') return '🌀 Spinning! Click arrow again to throw';
    if (boardPhase === 'throwing') return '💨 Dart thrown!';
    return '';
  };

  const hintColor =
    boardPhase === 'rotating' ? 'hsl(45,90%,60%)' :
      boardPhase === 'throwing' ? 'hsl(0,80%,65%)' :
        'hsl(220,10%,55%)';

  return (
    <div className="relative flex items-center justify-center gap-4 md:gap-8">
      {/* ═══ LEFT: Dart Arrow ═══ */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0 z-10">
        <DartArrow
          boardPhase={boardPhase}
          isFlying={dartFlying}
          isVisible={dartVisible}
          disabled={disabled}
          onClick={handleDartArrowClick}
        />
        <div className="text-center" style={{ maxWidth: 76 }}>
          <span
            className="text-[10px] font-mono leading-tight"
            style={{ color: boardPhase === 'rotating' ? 'hsl(45,90%,60%)' : boardPhase === 'idle' && !disabled ? '#ddd' : '#666' }}
          >
            {boardPhase === 'idle' && !disabled && '① Click me\nto spin!'}
            {boardPhase === 'rotating' && '② Click me\nto throw!'}
            {boardPhase === 'throwing' && '💨'}
            {disabled && '—'}
          </span>
        </div>
      </div>

      {/* ═══ CENTER: Flat Dartboard (Fast Performance) ═══ */}
      <div className="flex flex-col items-center">
        <svg
          viewBox="0 0 500 500"
          className="w-[290px] h-[290px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px]"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            transition: boardPhase === 'rotating' ? 'none' : 'transform 0.4s ease-out',
            filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))',
            pointerEvents: 'none',
            willChange: 'transform',
          }}
        >
          {/* Background */}
          <circle cx={CENTER} cy={CENTER} r={238} fill="#141514" />
          <circle cx={CENTER} cy={CENTER} r={234} fill="#1a1c1a" />

          {/* Ring fills — slightly different dark shades to add subtle depth */}
          {[...RING_RADII].reverse().map((ring, idx) => (
            <circle
              key={`fill-${idx}`}
              cx={CENTER} cy={CENTER}
              r={ring.outer * SCALE}
              fill={idx % 2 === 0 ? '#1f221f' : '#1a1c1a'}
            />
          ))}

          {/* White ring boundary lines */}
          {RING_RADII.map((ring, i) => (
            <circle
              key={`ring-line-${i}`}
              cx={CENTER} cy={CENTER}
              r={ring.outer * SCALE}
              fill="none"
              stroke="#ffffff"
              strokeWidth="6"
            />
          ))}

          {/* Number dots with simple fills */}
          {BOARD_LAYOUT.map((pos) => {
            const ringData = RING_RADII[pos.ring];
            // Dot strictly sits on the white ring line (the 'outer' radius)
            const r = ringData.outer;
            const [x, y] = polarToXY(pos.angle, r);
            const isCompleted = player.completed[pos.number];
            const isClosed = gameState.closedNumbers.has(pos.number);
            const hitPct = Math.min(player.hits[pos.number] / pos.number, 1);

            const dotFill = isClosed ? '#2a2a2a' : pos.color === 'red' ? '#b81515' : '#106b29';
            const textFill = isClosed ? '#666' : '#ffffff';
            const DOT_R = 18;

            return (
              <g key={pos.number} style={{ pointerEvents: 'none' }}>
                <circle cx={x} cy={y} r={DOT_R} fill={dotFill} opacity={isClosed ? 0.6 : 1} />

                {/* Progress arc */}
                {!isClosed && player.hits[pos.number] > 0 && (
                  <circle cx={x} cy={y} r={DOT_R + 4}
                    fill="none"
                    stroke={isCompleted ? '#22c55e' : '#facc15'}
                    strokeWidth="2.5"
                    strokeDasharray={`${hitPct * (2 * Math.PI * (DOT_R + 4))} ${2 * Math.PI * (DOT_R + 4)}`}
                    transform={`rotate(-90 ${x} ${y})`}
                    strokeLinecap="round"
                  />
                )}

                {/* Number text */}
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
                  fill={textFill} fontSize="15" fontWeight="bold" fontFamily="'Bebas Neue', sans-serif"
                >{pos.number}</text>

                {/* Hit badge */}
                {player.hits[pos.number] > 0 && !isClosed && (
                  <g className="pointer-events-none" transform={`translate(0, -${DOT_R + 10})`}>
                    <rect x={x - 10} y={y - 6} width={20} height={12} rx={3} fill="#111" />
                    <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fill="#facc15" fontSize="7" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">
                      {player.hits[pos.number]}/{pos.number}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Spinning visual cue */}
          {boardPhase === 'rotating' && (
            <circle cx={CENTER} cy={CENTER} r={232} fill="none" stroke="#facc15" strokeWidth="3" opacity="0.4" strokeDasharray="10 10" />
          )}

          {/* Stuck dart markers */}
          {stuckDarts.map((dart) => (
            <g key={dart.id}>
              <circle cx={dart.x} cy={dart.y} r={6} fill="#facc15" stroke="#111" strokeWidth="1" />
            </g>
          ))}
        </svg>

        {/* Hint text below board */}
        <div className="mt-4 text-center" style={{ minHeight: 20 }}>
          <span className="text-[13px] tracking-wide font-mono font-bold" style={{ color: hintColor, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {getHint()}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Flat Dart Arrow ─────────────────────────────────────────────────────────
const DartArrow: React.FC<{
  boardPhase: BoardPhase;
  isFlying: boolean;
  isVisible: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ boardPhase, isFlying, isVisible, disabled, onClick }) => {
  const canClick = (boardPhase === 'idle' || boardPhase === 'rotating') && !disabled;
  const isReadyToThrow = boardPhase === 'rotating';

  return (
    <div
      onClick={canClick ? onClick : undefined}
      style={{ cursor: canClick ? 'pointer' : 'default' }}
      className={`
        transition-all duration-300 select-none group
        ${!isVisible ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}
        ${isFlying ? 'translate-x-48 opacity-0 duration-500 ease-in' : ''}
        ${isReadyToThrow ? 'animate-pulse' : ''}
      `}
    >
      <div className="relative group-hover:-translate-y-1 transition-transform drop-shadow-xl">
        <svg viewBox="0 0 240 100" className="w-[120px] md:w-[150px]">
          {/* Flights - back */}
          <path d="M10,50 L40,20 L55,50 Z" fill={isReadyToThrow ? '#4ade80' : '#f87171'} />
          <path d="M10,50 L40,80 L55,50 Z" fill={isReadyToThrow ? '#22c55e' : '#ef4444'} />

          {/* Shaft */}
          <rect x="52" y="46" width="55" height="8" rx="2" fill="#555" />

          {/* Barrel */}
          <path d="M105,42 Q140,36 170,42 L170,58 Q140,64 105,58 Z" fill="#d4af37" />

          {/* Barrel Grips */}
          {[115, 125, 135, 145, 155].map(x => (
            <ellipse key={x} cx={x} cy="50" rx="2" ry="7" fill="#111" opacity="0.3" />
          ))}

          {/* Tip Metal Base */}
          <polygon points="170,44 190,47 190,53 170,56" fill="#888" />

          {/* Needle Tip */}
          <polygon points="190,48 230,50 190,52" fill="#d4d4d4" />

          {/* Ready Glow */}
          {!disabled && isReadyToThrow && (
            <circle cx="230" cy="50" r="5" fill="#4ade80" />
          )}
        </svg>
      </div>
    </div>
  );
};

export default Dartboard;
