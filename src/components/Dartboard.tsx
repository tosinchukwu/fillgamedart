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
      setStuckDarts([]);
      setBoardPhase('idle');
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
    if (disabled || gameState.gameOver || boardPhase === 'throwing') return;

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
  }, [disabled, gameState.gameOver, gameState.closedNumbers, boardPhase, player, onHitNumber, onHitRing, resolveDartLanding]);

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
      <div className="flex items-center justify-center gap-12 md:gap-20">
        {/* ═══ LEFT: Energy Cell (Dart) ═══ */}
        <div className="flex flex-col items-center gap-4 flex-shrink-0 z-10">
          <DartArrow
            boardPhase={boardPhase}
            isFlying={dartFlying}
            isVisible={dartVisible}
            disabled={disabled}
            onClick={handleDartArrowClick}
          />
          <div className="text-center glass-panel px-4 py-2 rounded-lg border-white/10">
            <span className="text-[10px] font-mono leading-tight tracking-[0.2em] text-white uppercase">
              {boardPhase === 'idle' && !disabled ? 'Throw Dart' : '...'}
            </span>
          </div>
        </div>

        {/* ═══ CENTER: Galaxy Dartboard ═══ */}
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

            {/* Galaxy Surface */}
            <circle cx={CENTER} cy={CENTER} r={245} fill="rgba(10, 10, 20, 0.4)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

            {/* Energy Rings - Now Solid Lines */}
            {[...RING_RADII].map((ring, i) => (
              <circle
                key={`ring-line-${i}`}
                cx={CENTER} cy={CENTER}
                r={ring.outer * SCALE}
                fill="none"
                stroke={ringColors[i]}
                strokeWidth="2.5"
                filter="url(#glow)"
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
                  {/* Outer Orbit Glow */}
                  <circle cx={x} cy={y} r={DOT_R + 6} fill="none" stroke={ringColors[pos.ring]} strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />

                  {/* Gem Dot */}
                  <circle cx={x} cy={y} r={DOT_R} fill={`url(#${gemId})`} filter={!isClosed ? "url(#glow)" : "none"} />

                  {/* Inner Shine */}
                  {!isClosed && <circle cx={x - 4} cy={y - 4} r={4} fill="white" opacity="0.3" />}

                  {/* Number text */}
                  <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
                    fill={isClosed ? "#666" : "#fff"} fontSize="16" fontWeight="bold" fontFamily="'JetBrains Mono', monospace"
                    style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}
                  >{pos.number}</text>

                  {/* Progress Ring */}
                  {!isClosed && player.hits[pos.number] > 0 && (
                    <circle cx={x} cy={y} r={DOT_R + 3}
                      fill="none"
                      stroke="var(--theme-accent)"
                      strokeWidth="3"
                      strokeDasharray={`${(Math.min(player.hits[pos.number] / pos.number, 1)) * (2 * Math.PI * (DOT_R + 3))} ${2 * Math.PI * (DOT_R + 3)}`}
                      transform={`rotate(-90 ${x} ${y})`}
                      strokeLinecap="round"
                      filter="url(#glow)"
                    />
                  )}
                </g>
              );
            })}

            {/* Stuck dart impact spots - Highly Visible */}
            {stuckDarts.map((dart) => (
              <g key={dart.id}>
                {/* Impact Wave */}
                <circle cx={dart.x} cy={dart.y} r={15} fill="none" stroke="var(--theme-accent)" strokeWidth="2" className="animate-ping" />
                {/* Secondary Glow */}
                <circle cx={dart.x} cy={dart.y} r={8} fill="var(--theme-glow)" filter="url(#glow)" />
                {/* Impact point */}
                <circle cx={dart.x} cy={dart.y} r={4} fill="#fff" filter="url(#glow)" />
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
const DartArrow: React.FC<{
  boardPhase: BoardPhase;
  isFlying: boolean;
  isVisible: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ boardPhase, isFlying, isVisible, disabled, onClick }) => {
  const canClick = boardPhase === 'idle' && !disabled;

  return (
    <div
      onClick={canClick ? onClick : undefined}
      style={{ cursor: canClick ? 'pointer' : 'default' }}
      className={`
        transition-all duration-300 select-none group
        ${!isVisible ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}
        ${isFlying ? 'translate-x-48 opacity-0 duration-500 ease-in' : ''}
        ${canClick ? 'hover:scale-110 active:scale-90' : ''}
      `}
    >
      <div className="relative" style={{ filter: 'drop-shadow(0 0 20px var(--theme-glow))' }}>
        <svg viewBox="0 0 200 60" className="w-[100px] md:w-[130px]">
          {/* Fletching (Back) */}
          <path d="M10,10 L40,30 L10,50 Z" fill="var(--theme-accent)" stroke="#fff" strokeWidth="1" />
          <path d="M20,10 L50,30 L20,50 Z" fill="var(--theme-accent)" stroke="#fff" strokeWidth="1" opacity="0.6" />

          {/* Shaft */}
          <rect x="50" y="27" width="100" height="6" fill="#fff" />

          {/* Tip (Front) */}
          <path d="M150,22 L190,30 L150,38 Z" fill="var(--theme-accent)" filter="url(#glow)" />

          {/* Shine on Shaft */}
          <rect x="60" y="28" width="40" height="2" fill="rgba(255,255,255,0.8)" />

          {/* Indicator Pulse */}
          {canClick && (
            <circle cx="190" cy="30" r="10" fill="var(--theme-accent)" opacity="0.4" className="animate-ping" />
          )}
        </svg>
      </div>
    </div>
  );
};

export default Dartboard;
