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
      const r = (RING_RADII[pos.ring].inner + RING_RADII[pos.ring].outer) / 2;
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
      {/* ═══ LEFT: 3D Dart Arrow ═══ */}
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

      {/* ═══ CENTER: 3D Dartboard ═══ */}
      <div className="flex flex-col items-center">
        <div style={{ filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.6)) drop-shadow(0 8px 10px rgba(0,0,0,0.4))' }}>
          <svg
            viewBox="0 0 500 500"
            className="w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] md:w-[420px] md:h-[420px]"
            style={{
              transform: `rotate(${rotationDeg}deg)`,
              transition: boardPhase === 'rotating' ? 'none' : 'transform 0.4s ease-out',
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          >
            <defs>
              {/* Board Base Gradients */}
              <linearGradient id="boardBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#444" />
                <stop offset="20%" stopColor="#252525" />
                <stop offset="80%" stopColor="#1a1a1a" />
                <stop offset="100%" stopColor="#0a0a0a" />
              </linearGradient>

              <radialGradient id="boardInnerGrad" cx="40%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#282828" />
                <stop offset="50%" stopColor="#1d1d1d" />
                <stop offset="90%" stopColor="#111111" />
                <stop offset="100%" stopColor="#080808" />
              </radialGradient>

              {/* 3D Drop Shadows & Bevels */}
              <filter id="whiteRingShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#000" floodOpacity="0.8" />
                <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
              </filter>

              <filter id="dot3D" x="-30%" y="-30%" width="160%" height="160%">
                {/* Outer shadow */}
                <feDropShadow dx="3" dy="6" stdDeviation="4" floodColor="#000" floodOpacity="0.75" result="shadow" />
                {/* Top specular highlight (bevel inner light) */}
                <feOffset dx="-2" dy="-2" in="SourceAlpha" result="highlightOffset" />
                <feGaussianBlur stdDeviation="2" in="highlightOffset" result="highlightBlur" />
                <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="highlightMask" in="highlightBlur" />
                <feFlood floodColor="#ffffff" floodOpacity="0.6" result="highlightColor" />
                <feComposite in="highlightColor" in2="highlightMask" operator="in" result="highlightFinal" />
                {/* Bottom shadow (bevel inner dark) */}
                <feOffset dx="2" dy="2" in="SourceAlpha" result="darkOffset" />
                <feGaussianBlur stdDeviation="2" in="darkOffset" result="darkBlur" />
                <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="darkMask" in="darkBlur" />
                <feFlood floodColor="#000000" floodOpacity="0.8" result="darkColor" />
                <feComposite in="darkColor" in2="darkMask" operator="in" result="darkFinal" />

                {/* Merge them all */}
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                  <feMergeNode in="highlightFinal" />
                  <feMergeNode in="darkFinal" />
                </feMerge>
              </filter>

              <filter id="textBevel">
                <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="#000" floodOpacity="0.5" />
              </filter>

              <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#22c55e" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* ── 3D Board Base ── */}
            {/* Thick outer rim edge (simulates 3D depth of board) */}
            <circle cx={CENTER} cy={CENTER + 8} r={240} fill="#0a0a0a" />

            {/* Main board face */}
            <circle cx={CENTER} cy={CENTER} r={240} fill="url(#boardBaseGrad)" stroke="#111" strokeWidth="2" />
            <circle cx={CENTER} cy={CENTER} r={235} fill="url(#boardInnerGrad)" />

            {/* Faint subtle ring grooves inside the black area to add depth */}
            {[...RING_RADII].reverse().map((ring, idx) => (
              <circle
                key={`groove-${idx}`}
                cx={CENTER} cy={CENTER}
                r={ring.outer * SCALE}
                fill="none"
                stroke="#000"
                strokeWidth="10"
                opacity="0.3"
                style={{ filter: boardPhase === 'rotating' ? 'none' : 'blur(3px)' }}
              />
            ))}

            {/* ── 3D White Thick Ring Boundaries ── */}
            {RING_RADII.map((ring, i) => (
              <circle
                key={`ring-line-${i}`}
                cx={CENTER} cy={CENTER}
                r={ring.outer * SCALE}
                fill="none"
                stroke="#f2f2f2"
                strokeWidth="7"
                filter={boardPhase === 'rotating' ? 'none' : "url(#whiteRingShadow)"}
              />
            ))}

            {/* ── 3D Number Dots ── */}
            {BOARD_LAYOUT.map((pos) => {
              const ringData = RING_RADII[pos.ring];
              const r = (ringData.inner + ringData.outer) / 2;
              const [x, y] = polarToXY(pos.angle, r);
              const isCompleted = player.completed[pos.number];
              const isClosed = gameState.closedNumbers.has(pos.number);
              const hitPct = Math.min(player.hits[pos.number] / pos.number, 1);

              const dotFill = isClosed ? '#2a2a2a' : pos.color === 'red' ? '#e13535' : '#1ab15a';
              const textFill = isClosed ? '#555' : '#ffffff';
              const DOT_R = 21;

              return (
                <g key={pos.number} style={{ pointerEvents: 'none' }}>
                  {/* Main 3D Dot */}
                  <circle
                    cx={x} cy={y}
                    r={DOT_R}
                    fill={dotFill}
                    filter={boardPhase === 'rotating' ? 'none' : "url(#dot3D)"}
                    opacity={isClosed ? 0.6 : 1}
                  />

                  {/* Number Text (bevelled) */}
                  <text
                    x={x} y={y + 1}
                    textAnchor="middle" dominantBaseline="central"
                    fill={textFill}
                    fontSize="22"
                    fontWeight="bold"
                    fontFamily="'Bebas Neue', sans-serif"
                    filter={boardPhase === 'rotating' ? 'none' : "url(#textBevel)"}
                  >
                    {pos.number}
                  </text>

                  {/* Progress arc showing hits around the 3D dot */}
                  {!isClosed && player.hits[pos.number] > 0 && (
                    <circle cx={x} cy={y} r={DOT_R + 5}
                      fill="none"
                      stroke={isCompleted ? '#22c55e' : '#facc15'}
                      strokeWidth="3.5"
                      strokeDasharray={`${hitPct * (2 * Math.PI * (DOT_R + 5))} ${2 * Math.PI * (DOT_R + 5)}`}
                      transform={`rotate(-90 ${x} ${y})`}
                      strokeLinecap="round"
                      filter="url(#ringGlow)"
                      opacity="0.9"
                    />
                  )}

                  {/* Hit badge */}
                  {player.hits[pos.number] > 0 && !isClosed && (
                    <g className="pointer-events-none" transform={`translate(0, -${DOT_R + 8})`}>
                      <rect x={x - 12} y={y - 7} width={24} height={14} rx={4}
                        fill="#111" stroke="#facc15" strokeWidth="1.2" />
                      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
                        fill="#facc15" fontSize="9" fontWeight="bold" fontFamily="'JetBrains Mono', monospace"
                      >
                        {player.hits[pos.number]}/{pos.number}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Stuck dart markers (simplistic 3D pin) */}
            {stuckDarts.map((dart) => (
              <g key={dart.id}>
                {/* shadow */}
                <ellipse cx={dart.x + 4} cy={dart.y + 6} rx="6" ry="3" fill="#000" opacity="0.6" filter="blur(2px)" />
                {/* pin body */}
                <path d={`M${dart.x - 7},${dart.y - 25} L${dart.x + 7},${dart.y - 25} L${dart.x + 2},${dart.y} L${dart.x - 2},${dart.y} Z`} fill="url(#boardBaseGrad)" stroke="#888" strokeWidth="1" />
                <polygon points={`${dart.x - 9},${dart.y - 35} ${dart.x + 9},${dart.y - 35} ${dart.x + 7},${dart.y - 25} ${dart.x - 7},${dart.y - 25}`} fill="#facc15" />
              </g>
            ))}
          </svg>
        </div>

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

// ─── 3D Dart Arrow ───────────────────────────────────────────────────────────
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
      <div className="relative group-hover:-translate-y-1 transition-transform drop-shadow-2xl">
        <svg viewBox="0 0 240 100" className="w-[140px] md:w-[180px]">
          <defs>
            <linearGradient id="dartMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="20%" stopColor="#cfcfcf" />
              <stop offset="50%" stopColor="#888" />
              <stop offset="80%" stopColor="#555" />
              <stop offset="100%" stopColor="#222" />
            </linearGradient>

            <linearGradient id="dartBrass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff2a8" />
              <stop offset="30%" stopColor="#d4af37" />
              <stop offset="70%" stopColor="#aa7c11" />
              <stop offset="100%" stopColor="#5c430a" />
            </linearGradient>

            <linearGradient id="dartFlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isReadyToThrow ? '#4ade80' : '#f87171'} />
              <stop offset="100%" stopColor={isReadyToThrow ? '#166534' : '#991b1b'} />
            </linearGradient>

            <filter id="flightShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="5" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Flights - back */}
          <path d="M10,50 L40,20 L55,50 Z" fill="url(#dartFlight)" filter="url(#flightShadow)" opacity="0.9" />
          <path d="M10,50 L40,80 L55,50 Z" fill="url(#dartFlight)" filter="url(#flightShadow)" opacity="0.9" />

          {/* Shaft */}
          <rect x="52" y="46" width="55" height="8" rx="2" fill="url(#dartMetal)" />

          {/* Barrel (Brass Body) */}
          <path d="M105,42 Q140,36 170,42 L170,58 Q140,64 105,58 Z" fill="url(#dartBrass)" />

          {/* Barrel Grips */}
          {[115, 125, 135, 145, 155].map(x => (
            <ellipse key={x} cx={x} cy="50" rx="2.5" ry="8" fill="#111" opacity="0.5" />
          ))}

          {/* Tip Metal Base */}
          <polygon points="170,44 190,47 190,53 170,56" fill="url(#dartMetal)" />

          {/* Needle Tip */}
          <polygon points="190,48 230,50 190,52" fill="url(#dartMetal)" />

          {/* Highlight along top edge */}
          <path d="M105,44 Q140,38 170,44" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.6" />

          {/* Ready Glow */}
          {!disabled && isReadyToThrow && (
            <circle cx="230" cy="50" r="6" fill="#4ade80" opacity="0.8" filter="blur(3px)" />
          )}
        </svg>
      </div>
    </div>
  );
};

export default Dartboard;
