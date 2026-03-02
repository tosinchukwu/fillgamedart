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

// Phases:
// idle → [click dart] → rotating → [click dart] → throwing → idle
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

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = boardPhase; }, [boardPhase]);

  // Clear on turn change
  const prevCpRef = useRef(cp);
  useEffect(() => {
    if (prevCpRef.current !== cp) {
      setStuckDarts([]);
      setBoardPhase('idle');
      prevCpRef.current = cp;
    }
  }, [cp]);

  // Cleanup
  useEffect(() => {
    return () => { if (rotAnimRef.current) cancelAnimationFrame(rotAnimRef.current); };
  }, []);

  // Resolve where the dart lands — random angle, weighted ring selection
  const resolveDartLanding = useCallback(() => {
    // Random angle around the board
    const landAngle = Math.random() * 360;
    // Ring weight: slightly favour middle rings for fun gameplay
    const weights = [0.15, 0.3, 0.35, 0.2]; // ring 0(inner)→ring 3(outer)
    const roll = Math.random();
    let cumulative = 0;
    let hitRingIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (roll < cumulative) { hitRingIdx = i; break; }
    }

    // Determine exact x,y on that ring
    const ring = RING_RADII[hitRingIdx];
    const landRadius = ring.inner + Math.random() * (ring.outer - ring.inner);
    const rad = ((landAngle - 90) * Math.PI) / 180;
    const lx = CENTER + landRadius * Math.cos(rad) * SCALE;
    const ly = CENTER + landRadius * Math.sin(rad) * SCALE;

    // Find closest number on this ring
    let closestNum = -1;
    let closestDist = Infinity;
    let closestPos: typeof BOARD_LAYOUT[0] | null = null;
    BOARD_LAYOUT.forEach((pos) => {
      if (pos.ring !== hitRingIdx) return;
      const r = (RING_RADII[pos.ring].inner + RING_RADII[pos.ring].outer) / 2;
      const [nx, ny] = polarToXY(pos.angle, r);
      const d = Math.sqrt((lx - nx) ** 2 + (ly - ny) ** 2);
      if (d < closestDist) {
        closestDist = d;
        closestNum = pos.number;
        closestPos = pos;
      }
    });

    // Decide if dart hit a ring LINE (boundary) or a number
    // Ring line = within 12px of ring boundary lines
    const ringBoundaryDist = Math.min(
      Math.abs(landRadius - ring.inner),
      Math.abs(landRadius - ring.outer)
    );
    const hitRingLine = ringBoundaryDist < 14;

    return { lx, ly, hitRingIdx, closestNum, hitRingLine, hitRingLineIdx: hitRingLine ? hitRingIdx : -1 };
  }, []);

  // ─── DART ARROW CLICK ─────────────────────────────────────────────────────
  const handleDartArrowClick = useCallback(() => {
    if (disabled || gameState.gameOver) return;

    // ── FIRST CLICK: start spinning ──
    if (boardPhase === 'idle') {
      setBoardPhase('rotating');
      phaseRef.current = 'rotating';

      const spinMs = (5 + Math.random() * 2) * 1000; // 5–7 s
      const fps = 60;
      const totalFrames = Math.round((spinMs / 1000) * fps);
      let frame = 0;

      const animate = () => {
        // Only continue if we're still in rotating phase
        if (phaseRef.current !== 'rotating') return;

        frame++;
        // Speed eases from ~9 deg/frame down to ~2 deg/frame over duration
        const t = frame / totalFrames;
        const speed = 9 - t * 7;
        rotDegRef.current = (rotDegRef.current + Math.max(speed, 2)) % 360;
        setRotationDeg(rotDegRef.current);

        if (frame < totalFrames) {
          rotAnimRef.current = requestAnimationFrame(animate);
        }
        // Board keeps its last rotation angle when stop is called
      };
      rotAnimRef.current = requestAnimationFrame(animate);
      return;
    }

    // ── SECOND CLICK: stop board + throw dart ──
    if (boardPhase === 'rotating') {
      // Stop the spin immediately
      if (rotAnimRef.current) {
        cancelAnimationFrame(rotAnimRef.current);
        rotAnimRef.current = null;
      }
      setBoardPhase('throwing');
      phaseRef.current = 'throwing';

      // Resolve landing BEFORE animation
      const { lx, ly, hitRingIdx, closestNum, hitRingLine, hitRingLineIdx } = resolveDartLanding();

      // Start dart fly animation
      setDartFlying(true);
      setDartVisible(false);

      setTimeout(() => {
        // Dart lands
        setDartFlying(false);
        setDartVisible(true);
        setBoardPhase('idle');
        phaseRef.current = 'idle';

        // Show stuck dart marker on board
        const id = ++dartIdCounter;
        setStuckDarts(prev => [...prev, { id, x: lx, y: ly }]);
        setTimeout(() => setStuckDarts(prev => prev.filter(d => d.id !== id)), 2500);

        // Score: ring line hit → applies to BOTH adjacent rings (current + outer)
        if (hitRingLine && hitRingLineIdx >= 0) {
          const rNums = RING_NUMBERS[hitRingLineIdx] ?? [];
          if (rNums.length > 0) onHitRing(hitRingLineIdx);
        } else if (closestNum !== -1) {
          if (!gameState.closedNumbers.has(closestNum) && !player.completed[closestNum]) {
            onHitNumber(closestNum);
          } else {
            // Number is closed/complete — fall back to ring
            const rNums = RING_NUMBERS[hitRingIdx] ?? [];
            if (rNums.length > 0) onHitRing(hitRingIdx);
          }
        }
      }, 560);
    }
  }, [disabled, gameState.gameOver, gameState.closedNumbers, boardPhase, player, onHitNumber, onHitRing, resolveDartLanding]);

  const getHint = () => {
    if (disabled) return 'Game Over';
    if (boardPhase === 'idle') return 'Click the dart arrow to spin the board';
    if (boardPhase === 'rotating') return '🌀 Spinning! Click dart again to stop & throw';
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
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
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
            style={{ color: boardPhase === 'rotating' ? 'hsl(45,90%,60%)' : boardPhase === 'idle' && !disabled ? 'hsl(200,70%,60%)' : 'hsl(220,10%,45%)' }}
          >
            {boardPhase === 'idle' && !disabled && '① Click me\nto spin!'}
            {boardPhase === 'rotating' && '② Click me\nto throw!'}
            {boardPhase === 'throwing' && '💨'}
            {disabled && '—'}
          </span>
        </div>
      </div>

      {/* ═══ CENTER: Dartboard ═══ */}
      <div className="flex flex-col items-center">
        <svg
          viewBox="0 0 500 500"
          className="w-[290px] h-[290px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px]"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            transition: boardPhase === 'rotating' ? 'none' : 'transform 0.4s ease-out',
            filter: 'drop-shadow(0 0 28px rgba(0,0,0,0.95))',
            pointerEvents: 'none', // board is purely visual now
          }}
        >
          <defs>
            <radialGradient id="boardBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1c1c1c" />
              <stop offset="55%" stopColor="#111" />
              <stop offset="100%" stopColor="#050505" />
            </radialGradient>
            <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="stuckGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <circle cx={CENTER} cy={CENTER} r={238} fill="#090909" stroke="#666" strokeWidth="3.5" />
          <circle cx={CENTER} cy={CENTER} r={234} fill="url(#boardBg)" />

          {/* Ring fills — alternating dark shades */}
          {[...RING_RADII].reverse().map((ring, idx) => (
            <circle
              key={`fill-${idx}`}
              cx={CENTER} cy={CENTER}
              r={ring.outer * SCALE}
              fill={idx % 2 === 0 ? '#141414' : '#0f0f0f'}
            />
          ))}

          {/* White ring boundary lines */}
          {RING_RADII.map((ring, i) => (
            <circle
              key={`ring-line-${i}`}
              cx={CENTER} cy={CENTER}
              r={ring.outer * SCALE}
              fill="none"
              stroke="#ddd"
              strokeWidth="2.5"
              opacity="0.85"
            />
          ))}

          {/* Center bullseye */}
          <circle cx={CENTER} cy={CENTER} r={18} fill="#181818" stroke="#bbb" strokeWidth="2" />
          <circle cx={CENTER} cy={CENTER} r={8} fill="#242424" stroke="#999" strokeWidth="1.5" />
          <circle cx={CENTER} cy={CENTER} r={3} fill="#aaa" />

          {/* Number dots with red/green backgrounds */}
          {BOARD_LAYOUT.map((pos) => {
            const ringData = RING_RADII[pos.ring];
            const r = (ringData.inner + ringData.outer) / 2;
            const [x, y] = polarToXY(pos.angle, r);
            const isCompleted = player.completed[pos.number];
            const isClosed = gameState.closedNumbers.has(pos.number);
            const hitPct = Math.min(player.hits[pos.number] / pos.number, 1);

            const baseFill = pos.color === 'red' ? '#8b1c1c' : '#14532d';
            const baseStroke = pos.color === 'red' ? '#ef4444' : '#22c55e';
            const dotFill = isClosed ? '#1a1a1a' : isCompleted ? '#14532d' : baseFill;
            const dotStroke = isClosed ? '#333' : isCompleted ? '#22c55e' : baseStroke;
            const R = 15;
            const circ = 2 * Math.PI * (R + 5);

            return (
              <g key={pos.number} style={{ pointerEvents: 'none' }}>
                <circle cx={x} cy={y} r={R}
                  fill={dotFill} stroke={dotStroke} strokeWidth="2.2"
                  filter="url(#dotGlow)" opacity={isClosed ? 0.3 : 1}
                />
                {/* Progress arc */}
                {!isClosed && player.hits[pos.number] > 0 && (
                  <circle cx={x} cy={y} r={R + 5}
                    fill="none"
                    stroke={isCompleted ? '#22c55e' : '#facc15'}
                    strokeWidth="2.5"
                    strokeDasharray={`${hitPct * circ} ${circ}`}
                    transform={`rotate(-90 ${x} ${y})`}
                    strokeLinecap="round"
                  />
                )}
                {/* Number text */}
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
                  fill={isClosed ? '#444' : '#fff'}
                  fontSize="12" fontWeight="bold"
                  fontFamily="'Bebas Neue', sans-serif"
                  className="pointer-events-none select-none"
                >{pos.number}</text>
                {/* Hit badge */}
                {player.hits[pos.number] > 0 && !isClosed && (
                  <g className="pointer-events-none">
                    <rect x={x - 9} y={y - 26} width={18} height={11} rx={2.5}
                      fill="#0a0a0a" fillOpacity="0.95" stroke="#facc15" strokeWidth="0.8" />
                    <text x={x} y={y - 20.5} textAnchor="middle" dominantBaseline="central"
                      fill="#facc15" fontSize="6.5" fontWeight="bold"
                      fontFamily="'JetBrains Mono', monospace"
                    >{player.hits[pos.number]}/{pos.number}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Spinning glow ring when rotating */}
          {boardPhase === 'rotating' && (
            <circle cx={CENTER} cy={CENTER} r={232}
              fill="none" stroke="#facc15" strokeWidth="3" opacity="0.4"
            >
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur="0.8s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Stuck dart markers */}
          {stuckDarts.map((dart) => (
            <g key={dart.id} filter="url(#stuckGlow)">
              <circle cx={dart.x} cy={dart.y} r={7} fill="#facc15" stroke="#fff" strokeWidth="1.5" opacity="0.95" />
              <circle cx={dart.x} cy={dart.y} r={2.5} fill="#fff" />
            </g>
          ))}
        </svg>

        {/* Hint text below board */}
        <div className="mt-2 text-center" style={{ minHeight: 20 }}>
          <span className="text-xs font-mono" style={{ color: hintColor }}>
            {getHint()}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Dart Arrow — horizontal, pointing RIGHT ──────────────────────────────────
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
        transition-all duration-300 select-none
        ${!isVisible ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}
        ${isFlying ? 'translate-x-36 opacity-0 duration-500' : ''}
        ${isReadyToThrow ? 'animate-pulse' : ''}
      `}
    >
      <div
        style={{
          filter: `drop-shadow(0 0 12px ${isReadyToThrow ? 'hsl(45 90% 55% / 0.9)'
              : boardPhase === 'idle' && !disabled ? 'hsl(200 80% 55% / 0.6)'
                : 'hsl(0 0% 20% / 0.3)'
            })`,
        }}
      >
        {/* Horizontal dart SVG — tip points RIGHT */}
        <svg viewBox="0 0 200 80" className="w-24 h-10 md:w-28 md:h-12">
          {/* Flights (left/tail end) */}
          <polygon points="0,40 28,16 42,40"
            fill={isReadyToThrow ? 'hsl(45, 90%, 45%)' : 'hsl(340, 80%, 50%)'}
            stroke={isReadyToThrow ? 'hsl(45, 100%, 60%)' : 'hsl(340, 90%, 60%)'}
            strokeWidth="1" opacity="0.95"
          />
          <polygon points="0,40 28,64 42,40"
            fill="hsl(200, 80%, 45%)" stroke="hsl(200, 90%, 60%)"
            strokeWidth="1" opacity="0.95"
          />
          <line x1="0" y1="40" x2="42" y2="40" stroke="hsl(0, 0%, 50%)" strokeWidth="1" />

          {/* Shaft */}
          <rect x="42" y="37" width="50" height="6" rx="1.5"
            fill="hsl(220, 15%, 25%)" stroke="hsl(0, 0%, 35%)" strokeWidth="0.6" />

          {/* Barrel */}
          <rect x="92" y="32" width="66" height="16" rx="4"
            fill="hsl(220, 20%, 32%)" stroke="hsl(200, 60%, 55%)" strokeWidth="1.2" />
          {[100, 110, 120, 130, 140, 150].map(x => (
            <line key={x} x1={x} y1="32" x2={x} y2="48"
              stroke="hsl(200, 80%, 65%)" strokeWidth="1.2" opacity="0.65" />
          ))}
          <rect x="93" y="33" width="8" height="14" rx="1"
            fill="hsl(200, 60%, 65%)" opacity="0.22" />

          {/* Needle / tip — points RIGHT */}
          <line x1="158" y1="40" x2="200" y2="40"
            stroke="#ccc" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="183" y1="40" x2="200" y2="40"
            stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />

          {/* Glowing tip */}
          {!disabled && (
            <circle cx="199" cy="40" r="4.5"
              fill={isReadyToThrow ? 'hsl(45, 100%, 60%)' : 'hsl(200, 90%, 62%)'}
              opacity="0.7"
            >
              <animate attributeName="opacity" values="0.3;0.9;0.3"
                dur={isReadyToThrow ? '0.6s' : '1.6s'} repeatCount="indefinite" />
            </circle>
          )}
        </svg>
      </div>
    </div>
  );
};

export default Dartboard;
