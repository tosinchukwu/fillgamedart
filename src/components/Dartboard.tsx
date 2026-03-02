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
  number: number;
}

let dartIdCounter = 0;

// Board phases
type BoardPhase = 'idle' | 'rotating' | 'ready' | 'throwing';

const Dartboard: React.FC<DartboardProps> = ({ gameState, onHitNumber, onHitRing, disabled }) => {
  const cp = gameState.currentPlayer;
  const player = gameState.players[cp];
  const [boardPhase, setBoardPhase] = useState<BoardPhase>('idle');
  const [rotationDeg, setRotationDeg] = useState(0);
  const [stuckDarts, setStuckDarts] = useState<DartStuck[]>([]);
  const [throwingAnim, setThrowingAnim] = useState(false);
  const [dartVisible, setDartVisible] = useState(true);
  const rotAnimRef = useRef<number | null>(null);
  const rotDegRef = useRef(0);
  const boardRef = useRef<SVGSVGElement>(null);

  // Clear stuck darts when turn changes
  const prevCpRef = useRef(cp);
  useEffect(() => {
    if (prevCpRef.current !== cp) {
      setStuckDarts([]);
      prevCpRef.current = cp;
    }
  }, [cp]);

  // Rotation animation
  const startRotation = useCallback(() => {
    if (boardPhase !== 'idle') return;
    setBoardPhase('rotating');

    const speed = 4; // degrees per frame
    const minSpins = 3; // at least 3 full spins
    const totalDeg = 360 * minSpins + Math.random() * 360;
    let covered = 0;

    const animate = () => {
      covered += speed;
      rotDegRef.current = (rotDegRef.current + speed) % 360;
      setRotationDeg(rotDegRef.current);

      if (covered < totalDeg) {
        rotAnimRef.current = requestAnimationFrame(animate);
      } else {
        // Stop - board is ready to receive the dart
        setBoardPhase('ready');
        setTimeout(() => {
          // Reset to idle if player doesn't throw
          // (they must click while 'ready')
        }, 4000);
      }
    };
    rotAnimRef.current = requestAnimationFrame(animate);
  }, [boardPhase]);

  useEffect(() => {
    return () => {
      if (rotAnimRef.current) cancelAnimationFrame(rotAnimRef.current);
    };
  }, []);

  // When user clicks the dartboard area in 'ready' phase: throw the dart
  const handleBoardClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled || gameState.gameOver) return;

    if (boardPhase === 'idle') {
      // First click: start rotation
      startRotation();
      return;
    }

    if (boardPhase !== 'ready') return;

    // Determine where the dart lands
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

    setBoardPhase('throwing');
    setThrowingAnim(true);
    setDartVisible(false);

    setTimeout(() => {
      setThrowingAnim(false);
      setBoardPhase('idle');
      setDartVisible(true);

      if (hitRingIdx === -1) return; // missed

      // Check if clicked near a specific number
      let closestNum = -1;
      let closestDist = Infinity;
      BOARD_LAYOUT.forEach((pos) => {
        const ringData = RING_RADII[pos.ring];
        const r = (ringData.inner + ringData.outer) / 2;
        const [nx, ny] = polarToXY(pos.angle, r);
        const d = Math.sqrt((px - nx) ** 2 + (py - ny) ** 2);
        if (d < closestDist && pos.ring === hitRingIdx) {
          closestDist = d;
          closestNum = pos.number;
        }
      });

      // Add stuck dart visual
      const id = ++dartIdCounter;
      setStuckDarts(prev => [...prev, { id, x: px, y: py, number: closestNum }]);
      setTimeout(() => setStuckDarts(prev => prev.filter(d => d.id !== id)), 2500);

      if (closestNum !== -1 && !gameState.closedNumbers.has(closestNum) && !player.completed[closestNum]) {
        onHitNumber(closestNum);
      } else if (hitRingIdx >= 0) {
        // Hit ring
        const nums = RING_NUMBERS[hitRingIdx];
        if (nums && nums.length > 0) {
          onHitRing(hitRingIdx);
        }
      }
    }, 600);
  }, [disabled, gameState.gameOver, gameState.closedNumbers, boardPhase, startRotation, player, onHitNumber, onHitRing]);

  // Generate SVG dartboard - black theme matching uploaded image
  const segmentAngle = 360 / 14;

  return (
    <div className="relative flex items-center" style={{ minHeight: '480px' }}>
      {/* === Dart Arrow on LEFT === */}
      <div className="flex flex-col items-center justify-center mr-6 md:mr-10" style={{ width: 80 }}>
        <DartArrow
          isThrown={throwingAnim}
          isVisible={dartVisible}
          disabled={disabled}
          boardPhase={boardPhase}
          onClickThrow={boardPhase === 'idle' ? startRotation : undefined}
        />
        <p className="text-xs text-center mt-3 font-mono" style={{ color: 'hsl(200, 70%, 60%)', fontSize: '10px', lineHeight: 1.3 }}>
          {boardPhase === 'idle' && !disabled && 'Click board\nto spin'}
          {boardPhase === 'rotating' && 'Spinning...'}
          {boardPhase === 'ready' && '🎯 Click board\nto throw!'}
          {boardPhase === 'throwing' && '💨 Thrown!'}
          {disabled && '—'}
        </p>
      </div>

      {/* === Dartboard CENTER === */}
      <div className="relative flex flex-col items-center">
        <svg
          ref={boardRef}
          viewBox="0 0 500 500"
          className="w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] md:w-[420px] md:h-[420px]"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            transition: boardPhase === 'rotating' ? 'none' : 'transform 0.3s ease-out',
            cursor: boardPhase === 'idle' ? 'pointer' : boardPhase === 'ready' ? 'crosshair' : 'not-allowed',
            filter: 'drop-shadow(0 0 24px rgba(0,0,0,0.9))',
          }}
          onClick={handleBoardClick}
        >
          <defs>
            <radialGradient id="boardBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="60%" stopColor="#111111" />
              <stop offset="100%" stopColor="#080808" />
            </radialGradient>
            <filter id="dotGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer black board circle */}
          <circle cx={CENTER} cy={CENTER} r={238} fill="#0a0a0a" stroke="#555" strokeWidth="3" />
          <circle cx={CENTER} cy={CENTER} r={234} fill="url(#boardBg)" />

          {/* Concentric rings - alternating black/very dark with white ring lines like original */}
          {RING_RADII.map((ring, ringIdx) => {
            if (ringIdx === 3) {
              // Bullseye area
              return (
                <g key={`ring-${ringIdx}`}>
                  <circle cx={CENTER} cy={CENTER} r={ring.outer * SCALE} fill="#1a1a1a" stroke="#eee" strokeWidth="2.5" />
                  <circle cx={CENTER} cy={CENTER} r={30 * SCALE} fill="#222" stroke="#ddd" strokeWidth="2" />
                  <circle cx={CENTER} cy={CENTER} r={12 * SCALE} fill="#333" stroke="#bbb" strokeWidth="1.5" />
                </g>
              );
            }
            return (
              <g key={`ring-${ringIdx}`}>
                <circle
                  cx={CENTER} cy={CENTER}
                  r={ring.outer * SCALE}
                  fill="none"
                  stroke="#ddd"
                  strokeWidth="2.5"
                />
              </g>
            );
          })}

          {/* Ring click zones (invisible) - only when 'ready' */}
          {boardPhase !== 'rotating' && RING_RADII.map((ring, i) => {
            const avgR = ((ring.inner + ring.outer) / 2) * SCALE;
            const thickness = (ring.outer - ring.inner) * SCALE * 0.8;
            return (
              <circle
                key={`ring-click-${i}`}
                cx={CENTER} cy={CENTER} r={avgR}
                fill="transparent" stroke="transparent" strokeWidth={thickness}
                style={{ pointerEvents: 'stroke' }}
              />
            );
          })}

          {/* Number labels with red/green dot backgrounds matching the image */}
          {BOARD_LAYOUT.map((pos) => {
            const ringData = RING_RADII[pos.ring];
            const r = (ringData.inner + ringData.outer) / 2;
            const [x, y] = polarToXY(pos.angle, r);
            const isCompleted = player.completed[pos.number];
            const isClosed = gameState.closedNumbers.has(pos.number);

            const dotColor = pos.color === 'red' ? '#b22' : '#1a7a3a';
            const dotStroke = pos.color === 'red' ? '#e44' : '#2ea355';
            const dotRadius = 16;

            return (
              <g key={pos.number} style={{ pointerEvents: 'none' }}>
                {/* Colored dot background */}
                <circle
                  cx={x} cy={y} r={dotRadius}
                  fill={isClosed ? '#222' : isCompleted ? '#1d5c2a' : dotColor}
                  stroke={isClosed ? '#444' : isCompleted ? '#39d46a' : dotStroke}
                  strokeWidth="2"
                  filter="url(#dotGlow)"
                  opacity={isClosed ? 0.4 : 1}
                />

                {/* Progress ring arc for completed progress */}
                {!isClosed && player.hits[pos.number] > 0 && (
                  <circle
                    cx={x} cy={y} r={dotRadius + 4}
                    fill="none"
                    stroke={isCompleted ? '#39d46a' : '#ffe066'}
                    strokeWidth="2.5"
                    strokeDasharray={`${Math.min(player.hits[pos.number] / pos.number, 1) * (2 * Math.PI * (dotRadius + 4))} ${2 * Math.PI * (dotRadius + 4)}`}
                    transform={`rotate(-90 ${x} ${y})`}
                    strokeLinecap="round"
                  />
                )}

                {/* Number text - white, bold */}
                <text
                  x={x} y={y + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fill={isClosed ? '#555' : '#fff'}
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="'Bebas Neue', sans-serif"
                  className="pointer-events-none select-none"
                >
                  {pos.number}
                </text>

                {/* Hit count badge */}
                {player.hits[pos.number] > 0 && !isClosed && (
                  <g className="pointer-events-none">
                    <rect x={x - 10} y={y - 28} width={20} height={12} rx={3}
                      fill="#111" fillOpacity="0.9" stroke="#ffe066" strokeWidth="0.8"
                    />
                    <text x={x} y={y - 22} textAnchor="middle" dominantBaseline="central"
                      fill="#ffe066" fontSize="7" fontWeight="bold"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {player.hits[pos.number]}/{pos.number}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Radial divider lines from bullseye outward */}
          {Array.from({ length: 14 }, (_, i) => {
            const angle = i * segmentAngle - 90;
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
                stroke="#555"
                strokeWidth="0.6"
                opacity="0.5"
              />
            );
          })}

          {/* Stuck darts on board */}
          {stuckDarts.map((dart) => (
            <g key={dart.id} filter="url(#dotGlow)">
              <circle cx={dart.x} cy={dart.y} r={5} fill="#ffe066" stroke="#fff" strokeWidth="1.5" opacity="0.9" />
              <circle cx={dart.x} cy={dart.y} r={2} fill="#fff" />
            </g>
          ))}

          {/* Board phase overlay ring indicator */}
          {boardPhase === 'ready' && (
            <circle
              cx={CENTER} cy={CENTER} r={235}
              fill="none"
              stroke="#39d46a"
              strokeWidth="4"
              opacity="0.7"
              strokeDasharray="20 10"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-90" dur="1.5s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>

        {/* Board status label below */}
        <div className="mt-2 text-center">
          {boardPhase === 'idle' && !disabled && (
            <span className="text-xs font-mono" style={{ color: 'hsl(200,70%,60%)' }}>
              Click the board to spin it
            </span>
          )}
          {boardPhase === 'rotating' && (
            <span className="text-xs font-mono animate-pulse" style={{ color: 'hsl(45,90%,60%)' }}>
              Board spinning... 🌀
            </span>
          )}
          {boardPhase === 'ready' && (
            <span className="text-xs font-mono" style={{ color: 'hsl(145,70%,55%)' }}>
              🎯 Board ready! Click to throw dart
            </span>
          )}
          {boardPhase === 'throwing' && (
            <span className="text-xs font-mono" style={{ color: 'hsl(0,80%,65%)' }}>
              💨 Dart thrown!
            </span>
          )}
          {disabled && (
            <span className="text-xs font-mono" style={{ color: 'hsl(220,10%,45%)' }}>Game Over</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Dart Arrow component — shown on the left side, pointing right toward the board
const DartArrow: React.FC<{
  isThrown: boolean;
  isVisible: boolean;
  disabled: boolean;
  boardPhase: BoardPhase;
  onClickThrow?: () => void;
}> = ({ isThrown, isVisible, disabled, boardPhase, onClickThrow }) => {
  const ready = boardPhase === 'ready';

  return (
    <div
      className={`
        transition-all duration-300 cursor-pointer select-none
        ${!isVisible ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}
        ${isThrown ? 'translate-x-32 opacity-0' : ''}
        ${ready ? 'animate-pulse' : ''}
      `}
      onClick={onClickThrow}
      style={{ filter: `drop-shadow(0 0 10px ${ready ? '#39d46a' : disabled ? '#333' : 'hsl(200 80% 50% / 0.4)'})` }}
    >
      {/* Dart SVG rotated 90deg to point RIGHT toward the board */}
      <svg
        viewBox="0 0 80 200"
        className="w-10 h-24 md:w-12 md:h-28"
        style={{ transform: 'rotate(90deg)' }}
      >
        {/* Tip */}
        <line x1="40" y1="0" x2="40" y2="35" stroke="#ddd" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" y1="0" x2="40" y2="12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />

        {/* Barrel */}
        <rect x="35" y="35" width="10" height="55" rx="3" fill="hsl(220, 20%, 35%)" stroke="hsl(200, 60%, 55%)" strokeWidth="1.2" />
        {[42, 50, 58, 66, 74].map(y => (
          <line key={y} x1="35" y1={y} x2="45" y2={y} stroke="hsl(200, 80%, 65%)" strokeWidth="1" opacity="0.7" />
        ))}
        <rect x="37" y="36" width="3" height="53" rx="1" fill="hsl(200, 60%, 60%)" opacity="0.3" />

        {/* Shaft */}
        <rect x="38" y="90" width="4" height="50" rx="1" fill="hsl(220, 15%, 25%)" stroke="hsl(0, 0%, 40%)" strokeWidth="0.5" />

        {/* Flights */}
        <polygon points="40,130 20,178 40,162" fill={ready ? 'hsl(145, 80%, 45%)' : 'hsl(340, 80%, 50%)'} stroke={ready ? 'hsl(145, 90%, 60%)' : 'hsl(340, 90%, 60%)'} strokeWidth="0.8" opacity="0.92" />
        <polygon points="40,130 60,178 40,162" fill="hsl(200, 80%, 45%)" stroke="hsl(200, 90%, 60%)" strokeWidth="0.8" opacity="0.92" />
        <line x1="40" y1="130" x2="40" y2="178" stroke="hsl(0, 0%, 55%)" strokeWidth="1" />

        {/* Glow at tip */}
        {!disabled && (
          <circle cx="40" cy="4" r="5" fill={ready ? '#39d46a' : 'hsl(200, 90%, 60%)'} opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </div>
  );
};

export default Dartboard;
