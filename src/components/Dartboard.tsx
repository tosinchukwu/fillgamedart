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

// Game phases for throwing mechanic:
// idle → click dart arrow → rotating(5-7s) → ready → click dart arrow → aiming → click board → resolving → idle
type BoardPhase = 'idle' | 'rotating' | 'ready' | 'aiming' | 'resolving';

const Dartboard: React.FC<DartboardProps> = ({ gameState, onHitNumber, onHitRing, disabled }) => {
  const cp = gameState.currentPlayer;
  const player = gameState.players[cp];
  const [boardPhase, setBoardPhase] = useState<BoardPhase>('idle');
  const [rotationDeg, setRotationDeg] = useState(0);
  const [stuckDarts, setStuckDarts] = useState<DartStuck[]>([]);
  const [dartVisible, setDartVisible] = useState(true);
  const [dartThrown, setDartThrown] = useState(false);
  const rotAnimRef = useRef<number | null>(null);
  const rotDegRef = useRef(0);
  const boardRef = useRef<SVGSVGElement>(null);

  // Clear stuck darts on turn change
  const prevCpRef = useRef(cp);
  useEffect(() => {
    if (prevCpRef.current !== cp) {
      setStuckDarts([]);
      setBoardPhase('idle');
      prevCpRef.current = cp;
    }
  }, [cp]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => { if (rotAnimRef.current) cancelAnimationFrame(rotAnimRef.current); };
  }, []);

  // ─── STEP 1: User clicks the dart arrow → start spinning ───────────────────
  const handleDartArrowClick = useCallback(() => {
    if (disabled || gameState.gameOver) return;

    if (boardPhase === 'idle') {
      // Start the board spinning
      setBoardPhase('rotating');

      const spinDuration = (5 + Math.random() * 2) * 1000; // 5-7 seconds in ms
      const fps = 60;
      const totalFrames = (spinDuration / 1000) * fps;
      let frame = 0;

      const animate = () => {
        frame++;
        // Easing: fast at start, slow at end
        const t = frame / totalFrames;
        const speed = 8 * (1 - t * 0.8); // slows from 8°/frame to 1.6°/frame
        rotDegRef.current = (rotDegRef.current + speed) % 360;
        setRotationDeg(rotDegRef.current);

        if (frame < totalFrames) {
          rotAnimRef.current = requestAnimationFrame(animate);
        } else {
          // Board stopped!
          setBoardPhase('ready');
        }
      };
      rotAnimRef.current = requestAnimationFrame(animate);
      return;
    }

    if (boardPhase === 'ready') {
      // STEP 2: User clicks dart arrow again → enter aiming mode
      setBoardPhase('aiming');
      return;
    }
  }, [disabled, gameState.gameOver, boardPhase]);

  // ─── STEP 3: User clicks on the dartboard → dart lands there ───────────────
  const handleBoardClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled || gameState.gameOver || boardPhase !== 'aiming') return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 500;
    const py = ((e.clientY - rect.top) / rect.height) * 500;

    const dx = px - CENTER;
    const dy = py - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Determine which ring was hit
    let hitRingIdx = -1;
    for (let i = 0; i < RING_RADII.length; i++) {
      const r = RING_RADII[i];
      if (dist >= r.inner * SCALE && dist <= r.outer * SCALE) {
        hitRingIdx = i;
        break;
      }
    }

    setBoardPhase('resolving');
    setDartThrown(true);
    setDartVisible(false);

    // Dart fly animation duration
    setTimeout(() => {
      setDartThrown(false);
      setDartVisible(true);
      setBoardPhase('idle');

      if (hitRingIdx === -1) return; // missed board

      // Show stuck dart
      const id = ++dartIdCounter;
      setStuckDarts(prev => [...prev, { id, x: px, y: py }]);
      setTimeout(() => setStuckDarts(prev => prev.filter(d => d.id !== id)), 2500);

      // Find closest number on this ring
      let closestNum = -1;
      let closestDist = Infinity;
      BOARD_LAYOUT.forEach((pos) => {
        if (pos.ring !== hitRingIdx) return;
        const ringData = RING_RADII[pos.ring];
        const r = (ringData.inner + ringData.outer) / 2;
        const [nx, ny] = polarToXY(pos.angle, r);
        const d = Math.sqrt((px - nx) ** 2 + (py - ny) ** 2);
        if (d < closestDist) {
          closestDist = d;
          closestNum = pos.number;
        }
      });

      if (closestNum !== -1 && !gameState.closedNumbers.has(closestNum) && !player.completed[closestNum]) {
        onHitNumber(closestNum);
      } else {
        // Hit the ring line → affect all numbers on this ring
        const nums = RING_NUMBERS[hitRingIdx];
        if (nums && nums.length > 0) onHitRing(hitRingIdx);
      }
    }, 550);
  }, [disabled, gameState.gameOver, gameState.closedNumbers, boardPhase, player, onHitNumber, onHitRing]);

  const getHint = () => {
    if (disabled) return 'Game Over';
    if (boardPhase === 'idle') return 'Click dart to spin the board';
    if (boardPhase === 'rotating') return 'Board spinning...';
    if (boardPhase === 'ready') return 'Board stopped! Click dart again to throw';
    if (boardPhase === 'aiming') return '🎯 Now click anywhere on the board to aim!';
    if (boardPhase === 'resolving') return '💨 Dart thrown!';
    return '';
  };

  const hintColor = () => {
    if (boardPhase === 'ready') return 'hsl(45,90%,60%)';
    if (boardPhase === 'aiming') return 'hsl(145,70%,55%)';
    if (boardPhase === 'rotating') return 'hsl(200,80%,60%)';
    if (boardPhase === 'resolving') return 'hsl(0,80%,65%)';
    return 'hsl(220,10%,55%)';
  };

  return (
    <div className="relative flex items-center justify-center gap-4 md:gap-6">

      {/* ═══ LEFT: Dart Arrow ═══ */}
      <div className="flex flex-col items-center gap-2">
        <DartArrow
          boardPhase={boardPhase}
          isThrown={dartThrown}
          isVisible={dartVisible}
          disabled={disabled}
          onClick={handleDartArrowClick}
        />
        {/* Dart step label */}
        <span className="text-[10px] font-mono text-center leading-tight" style={{ color: hintColor(), maxWidth: 70 }}>
          {boardPhase === 'idle' && !disabled && 'Click me!'}
          {boardPhase === 'rotating' && '⏳ spinning'}
          {boardPhase === 'ready' && '→ click\nme again'}
          {boardPhase === 'aiming' && '🎯 aim on\nboard!'}
          {boardPhase === 'resolving' && '💨'}
        </span>
      </div>

      {/* ═══ CENTER: Dartboard ═══ */}
      <div className="flex flex-col items-center">
        <svg
          ref={boardRef}
          viewBox="0 0 500 500"
          className="w-[290px] h-[290px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px]"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            transition: boardPhase === 'rotating' ? 'none' : boardPhase === 'idle' ? 'transform 0.5s ease-out' : 'none',
            cursor: boardPhase === 'aiming' ? 'crosshair' : 'default',
            filter: 'drop-shadow(0 0 28px rgba(0,0,0,0.95))',
          }}
          onClick={handleBoardClick}
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

          {/* ── Background ── */}
          <circle cx={CENTER} cy={CENTER} r={238} fill="#0a0a0a" stroke="#666" strokeWidth="3.5" />
          <circle cx={CENTER} cy={CENTER} r={234} fill="url(#boardBg)" />

          {/* ── Concentric ring fills (alternating dark shades) ── */}
          {[...RING_RADII].reverse().map((ring, idx) => (
            <circle
              key={`fill-${idx}`}
              cx={CENTER} cy={CENTER}
              r={ring.outer * SCALE}
              fill={idx % 2 === 0 ? '#141414' : '#111'}
            />
          ))}

          {/* ── White ring boundary lines (like the photo) ── */}
          {RING_RADII.map((ring, ringIdx) => (
            <circle
              key={`line-${ringIdx}`}
              cx={CENTER} cy={CENTER}
              r={ring.outer * SCALE}
              fill="none"
              stroke="#ddd"
              strokeWidth={ringIdx === RING_RADII.length - 1 ? 2 : 2.5}
              opacity="0.85"
            />
          ))}

          {/* ── Innermost bullseye center dot ── */}
          <circle cx={CENTER} cy={CENTER} r={18} fill="#1a1a1a" stroke="#bbb" strokeWidth="2" />
          <circle cx={CENTER} cy={CENTER} r={8} fill="#282828" stroke="#999" strokeWidth="1.5" />
          <circle cx={CENTER} cy={CENTER} r={3} fill="#aaa" />

          {/* ── Radial divider lines ── */}
          {RING_RADII.map((_, ringIdx) => {
            // Each ring draws dividers between its numbers
            const numsOnRing = BOARD_LAYOUT.filter(p => p.ring === ringIdx);
            const inner = ringIdx === 0 ? 18 : RING_RADII[ringIdx - 1].outer * SCALE;
            const outer = RING_RADII[ringIdx].outer * SCALE;
            return numsOnRing.map((pos, ni) => {
              const nextPos = numsOnRing[(ni + 1) % numsOnRing.length];
              const midAngle = ((pos.angle + nextPos.angle) / 2 + (pos.angle > nextPos.angle ? 180 : 0) + 360) % 360;
              const rad = ((midAngle - 90) * Math.PI) / 180;
              return (
                <line
                  key={`rdiv-${ringIdx}-${ni}`}
                  x1={CENTER + inner * Math.cos(rad)}
                  y1={CENTER + inner * Math.sin(rad)}
                  x2={CENTER + outer * Math.cos(rad)}
                  y2={CENTER + outer * Math.sin(rad)}
                  stroke="#666"
                  strokeWidth="0.7"
                  opacity="0.5"
                />
              );
            });
          })}

          {/* ── Number dots ── */}
          {BOARD_LAYOUT.map((pos) => {
            const ringData = RING_RADII[pos.ring];
            const r = (ringData.inner + ringData.outer) / 2;
            const [x, y] = polarToXY(pos.angle, r);
            const isCompleted = player.completed[pos.number];
            const isClosed = gameState.closedNumbers.has(pos.number);
            const hitProgress = Math.min(player.hits[pos.number] / pos.number, 1);

            const baseDotColor = pos.color === 'red' ? '#9b1c1c' : '#14532d';
            const baseDotStroke = pos.color === 'red' ? '#ef4444' : '#22c55e';
            const dotColor = isClosed ? '#1a1a1a' : isCompleted ? '#14532d' : baseDotColor;
            const dotStroke = isClosed ? '#333' : isCompleted ? '#22c55e' : baseDotStroke;
            const dotR = 15;
            const arcCirc = 2 * Math.PI * (dotR + 5);

            return (
              <g key={pos.number} style={{ pointerEvents: 'none' }}>
                {/* Dot background */}
                <circle
                  cx={x} cy={y} r={dotR}
                  fill={dotColor}
                  stroke={dotStroke}
                  strokeWidth="2"
                  filter="url(#dotGlow)"
                  opacity={isClosed ? 0.35 : 1}
                />

                {/* Hit progress arc */}
                {!isClosed && player.hits[pos.number] > 0 && (
                  <circle
                    cx={x} cy={y}
                    r={dotR + 5}
                    fill="none"
                    stroke={isCompleted ? '#22c55e' : '#facc15'}
                    strokeWidth="2.5"
                    strokeDasharray={`${hitProgress * arcCirc} ${arcCirc}`}
                    transform={`rotate(-90 ${x} ${y})`}
                    strokeLinecap="round"
                  />
                )}

                {/* Number text */}
                <text
                  x={x} y={y + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fill={isClosed ? '#444' : '#fff'}
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="'Bebas Neue', sans-serif"
                  className="pointer-events-none select-none"
                >
                  {pos.number}
                </text>

                {/* Hit count badge */}
                {player.hits[pos.number] > 0 && !isClosed && (
                  <g className="pointer-events-none">
                    <rect x={x - 9} y={y - 26} width={18} height={11} rx={2.5}
                      fill="#0a0a0a" fillOpacity="0.95" stroke="#facc15" strokeWidth="0.8"
                    />
                    <text x={x} y={y - 20.5} textAnchor="middle" dominantBaseline="central"
                      fill="#facc15" fontSize="6.5" fontWeight="bold"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {player.hits[pos.number]}/{pos.number}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Aiming overlay: pulsing ring to show it's clickable ── */}
          {boardPhase === 'aiming' && (
            <circle
              cx={CENTER} cy={CENTER} r={232}
              fill="none"
              stroke="#22c55e"
              strokeWidth="4"
              opacity="0.6"
              strokeDasharray="22 11"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-99" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.2s" repeatCount="indefinite" />
            </circle>
          )}

          {/* ── Ready overlay: faint glow ring ── */}
          {boardPhase === 'ready' && (
            <circle
              cx={CENTER} cy={CENTER} r={232}
              fill="none"
              stroke="#facc15"
              strokeWidth="3"
              opacity="0.4"
            >
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur="1.5s" repeatCount="indefinite" />
            </circle>
          )}

          {/* ── Stuck dart markers ── */}
          {stuckDarts.map((dart) => (
            <g key={dart.id} filter="url(#stuckGlow)">
              <circle cx={dart.x} cy={dart.y} r={6} fill="#facc15" stroke="#fff" strokeWidth="1.5" opacity="0.95" />
              <circle cx={dart.x} cy={dart.y} r={2.5} fill="#fff" />
            </g>
          ))}
        </svg>

        {/* ── Hint label below board ── */}
        <div className="mt-2 text-center h-5">
          <span className="text-xs font-mono" style={{ color: hintColor() }}>
            {getHint()}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Dart Arrow Component (points RIGHT toward board) ──────────────────────────
const DartArrow: React.FC<{
  boardPhase: BoardPhase;
  isThrown: boolean;
  isVisible: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ boardPhase, isThrown, isVisible, disabled, onClick }) => {
  const ready = boardPhase === 'ready';
  const aiming = boardPhase === 'aiming';
  const spinning = boardPhase === 'rotating';
  const canClick = (boardPhase === 'idle' || boardPhase === 'ready') && !disabled;

  return (
    <div
      className="flex flex-col items-center gap-1"
      onClick={canClick ? onClick : undefined}
      style={{ cursor: canClick ? 'pointer' : 'default' }}
    >
      <div
        className={`
          transition-all duration-300
          ${!isVisible ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}
          ${isThrown ? 'translate-x-28 opacity-0' : ''}
          ${ready ? 'animate-pulse' : ''}
        `}
        style={{
          filter: `drop-shadow(0 0 12px ${aiming ? 'hsl(145 70% 55% / 0.9)'
              : ready ? 'hsl(45 90% 55% / 0.9)'
                : spinning ? 'hsl(200 80% 55% / 0.5)'
                  : disabled ? 'hsl(0 0% 20% / 0.3)'
                    : 'hsl(200 80% 55% / 0.5)'
            })`,
        }}
      >
        {/* Dart oriented to point RIGHT (tip on right side) */}
        <svg
          viewBox="0 0 200 80"
          className="w-24 h-10 md:w-28 md:h-12"
        >
          {/* Flights (at LEFT/back of dart) */}
          <polygon
            points="0,40 28,18 42,40"
            fill={ready || aiming ? 'hsl(145, 80%, 45%)' : 'hsl(340, 80%, 50%)'}
            stroke={ready || aiming ? 'hsl(145, 90%, 60%)' : 'hsl(340, 90%, 60%)'}
            strokeWidth="1"
            opacity="0.95"
          />
          <polygon
            points="0,40 28,62 42,40"
            fill="hsl(200, 80%, 45%)"
            stroke="hsl(200, 90%, 60%)"
            strokeWidth="1"
            opacity="0.95"
          />
          <line x1="0" y1="40" x2="42" y2="40" stroke="hsl(0, 0%, 50%)" strokeWidth="1" />

          {/* Shaft */}
          <rect x="42" y="37" width="50" height="6" rx="1.5"
            fill="hsl(220, 15%, 25%)" stroke="hsl(0, 0%, 35%)" strokeWidth="0.6" />

          {/* Barrel (grip) */}
          <rect x="90" y="32" width="68" height="16" rx="4"
            fill="hsl(220, 20%, 32%)" stroke="hsl(200, 60%, 55%)" strokeWidth="1.2" />
          {/* Grip rings */}
          {[98, 108, 118, 128, 138, 148].map(x => (
            <line key={x} x1={x} y1="32" x2={x} y2="48"
              stroke="hsl(200, 80%, 65%)" strokeWidth="1.2" opacity="0.65" />
          ))}
          {/* Barrel highlight */}
          <rect x="91" y="33" width="8" height="14" rx="1"
            fill="hsl(200, 60%, 65%)" opacity="0.25" />

          {/* Tip / needle (points RIGHT) */}
          <line x1="158" y1="40" x2="200" y2="40"
            stroke="#ccc" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="185" y1="40" x2="200" y2="40"
            stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />

          {/* Glowing tip */}
          {!disabled && (
            <circle cx="200" cy="40" r="4.5"
              fill={ready || aiming ? '#22c55e' : 'hsl(200, 90%, 62%)'}
              opacity="0.65"
            >
              <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.5s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>
      </div>
    </div>
  );
};

export default Dartboard;
