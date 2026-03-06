import React from 'react';

export type BackgroundMode = 'sky' | 'galaxy' | 'globe' | 'custom';

interface BackgroundLayerProps {
    mode: BackgroundMode;
    customUrl?: string;
}

// ─── Galaxy Background with animated planets ─────────────────────────────────
const GalaxyBackground = () => (
    <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ background: 'radial-gradient(ellipse at 30% 20%, #0f0035 0%, #020008 60%, #000005 100%)' }}>
        {/* Stars */}
        {Array.from({ length: 120 }).map((_, i) => {
            const size = Math.random() * 2.5 + 0.5;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const delay = Math.random() * 5;
            const dur = Math.random() * 3 + 2;
            return (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${size}px`,
                        height: `${size}px`,
                        borderRadius: '50%',
                        background: 'white',
                        animation: `twinkle ${dur}s ease-in-out ${delay}s infinite alternate`,
                        opacity: Math.random() * 0.7 + 0.3,
                    }}
                />
            );
        })}

        {/* Nebula blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: '40vw', height: '30vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(100,0,200,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: '35vw', height: '25vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,80,200,0.15) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '60%', width: '25vw', height: '20vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(200,0,100,0.12) 0%, transparent 70%)', filter: 'blur(35px)' }} />

        {/* Planets */}
        {/* Large planet — purple with rings */}
        <div style={{ position: 'absolute', top: '12%', right: '8%' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #c084fc, #7e22ce 60%, #3b0764 100%)', boxShadow: '0 0 30px rgba(192,132,252,0.4), inset -10px -10px 20px rgba(0,0,0,0.5)', animation: 'float 8s ease-in-out infinite alternate', position: 'relative' }}>
                {/* Ring */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotateX(72deg)', width: '150px', height: '30px', borderRadius: '50%', border: '6px solid rgba(192,132,252,0.35)', pointerEvents: 'none' }} />
            </div>
        </div>

        {/* Medium planet — blue */}
        <div style={{ position: 'absolute', top: '55%', left: '4%', width: '60px', height: '60px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #60a5fa, #1d4ed8 60%, #1e3a8a 100%)', boxShadow: '0 0 20px rgba(96,165,250,0.35), inset -8px -8px 16px rgba(0,0,0,0.5)', animation: 'float 11s ease-in-out 2s infinite alternate' }} />

        {/* Small distant planet — orange */}
        <div style={{ position: 'absolute', top: '30%', left: '30%', width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #fb923c, #c2410c 60%, #7c2d12 100%)', boxShadow: '0 0 12px rgba(251,146,60,0.4)', animation: 'float 7s ease-in-out 1s infinite alternate' }} />

        {/* Tiny moon near large planet */}
        <div style={{ position: 'absolute', top: '8%', right: '4%', width: '16px', height: '16px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #d1d5db, #6b7280)', boxShadow: 'inset -3px -3px 6px rgba(0,0,0,0.5)', animation: 'float 9s ease-in-out 3s infinite alternate' }} />

        {/* Milky way band */}
        <div style={{ position: 'absolute', top: '20%', left: '-20%', width: '140%', height: '35%', background: 'radial-gradient(ellipse at 50% 50%, rgba(200,180,255,0.06) 0%, transparent 70%)', transform: 'rotate(-15deg)', filter: 'blur(20px)', pointerEvents: 'none' }} />

        <style>{`
      @keyframes twinkle { from { opacity: 0.2; } to { opacity: 1; } }
      @keyframes float { from { transform: translateY(0px); } to { transform: translateY(-12px); } }
    `}</style>
    </div>
);

// ─── Globe / World Map Background ───────────────────────────────────────────
const GlobeBackground = () => (
    <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 30%, #0a1628 0%, #020a18 100%)' }}>
        {/* Ocean ambient glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,60,150,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Globe SVG */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.85 }}>
            <svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 40px rgba(0,120,255,0.3))' }}>
                <defs>
                    <radialGradient id="oceanGrad" cx="40%" cy="35%">
                        <stop offset="0%" stopColor="#1a6fa8" />
                        <stop offset="60%" stopColor="#0c3d6e" />
                        <stop offset="100%" stopColor="#061a30" />
                    </radialGradient>
                    <radialGradient id="glowRing" cx="50%" cy="50%">
                        <stop offset="70%" stopColor="transparent" />
                        <stop offset="90%" stopColor="rgba(0,120,255,0.15)" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                    <clipPath id="globeClip">
                        <circle cx="300" cy="300" r="270" />
                    </clipPath>
                </defs>
                {/* Ocean */}
                <circle cx="300" cy="300" r="270" fill="url(#oceanGrad)" />
                {/* Atmosphere glow rings */}
                <circle cx="300" cy="300" r="280" fill="none" stroke="rgba(0,150,255,0.2)" strokeWidth="8" />
                <circle cx="300" cy="300" r="272" fill="none" stroke="rgba(100,200,255,0.15)" strokeWidth="3" />
                <circle cx="300" cy="300" r="271" fill="url(#glowRing)" />
                {/* Grid lines */}
                <g clipPath="url(#globeClip)" stroke="rgba(0,150,255,0.12)" strokeWidth="1" fill="none">
                    {/* Latitude lines */}
                    {[60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540].map(y => (
                        <line key={y} x1="30" y1={y} x2="570" y2={y} />
                    ))}
                    {/* Longitude lines (ellipses) */}
                    {[30, 80, 130, 180, 230, 280, 330, 380, 430, 480, 530].map(x => (
                        <ellipse key={x} cx="300" cy="300" rx={Math.abs(x - 300) + 10} ry="270" />
                    ))}
                </g>
                {/* Continents */}
                <g clipPath="url(#globeClip)" fill="rgba(34,120,50,0.75)" stroke="rgba(50,180,80,0.3)" strokeWidth="0.8">
                    {/* North America */}
                    <path d="M60 155 L90 130 L130 125 L165 135 L180 160 L175 200 L160 230 L140 260 L115 275 L90 265 L70 240 L55 210 L50 185 Z" />
                    {/* South America */}
                    <path d="M130 280 L165 270 L185 285 L195 320 L190 360 L175 400 L155 430 L130 440 L110 420 L100 385 L110 345 L115 310 Z" />
                    {/* Europe */}
                    <path d="M270 120 L300 115 L315 125 L320 145 L305 165 L285 175 L265 165 L258 148 L260 130 Z" />
                    {/* Africa */}
                    <path d="M258 175 L290 168 L320 175 L335 205 L338 250 L328 300 L310 340 L288 360 L265 350 L248 315 L242 270 L245 225 L250 195 Z" />
                    {/* Asia */}
                    <path d="M325 110 L390 100 L450 115 L490 140 L510 175 L500 210 L470 230 L430 240 L385 235 L350 215 L330 185 L315 155 Z" />
                    {/* Australia */}
                    <path d="M430 300 L475 290 L510 305 L525 335 L515 365 L490 380 L455 375 L430 355 L420 325 Z" />
                    {/* Greenland */}
                    <path d="M165 80 L200 72 L225 82 L230 105 L215 120 L190 125 L170 112 L158 95 Z" />
                </g>
                {/* Ice caps */}
                <g clipPath="url(#globeClip)" fill="rgba(220,240,255,0.6)">
                    <ellipse cx="300" cy="48" rx="80" ry="22" />
                    <ellipse cx="300" cy="552" rx="90" ry="25" />
                </g>
                {/* Specular highlight */}
                <ellipse cx="220" cy="200" rx="80" ry="60" fill="rgba(255,255,255,0.06)" clipPath="url(#globeClip)" />
            </svg>
        </div>

        {/* Latitude glow lines far out */}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 58px, rgba(0,80,200,0.04) 60px)', pointerEvents: 'none' }} />

        {/* Stars behind */}
        {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`, borderRadius: '50%', background: 'white', opacity: Math.random() * 0.5 + 0.1 }} />
        ))}
    </div>
);

// ─── Main exported component ─────────────────────────────────────────────────
const BackgroundLayer: React.FC<BackgroundLayerProps> = ({ mode, customUrl }) => {
    if (mode === 'sky') return null; // uses body::before with /sky-bg.png

    if (mode === 'galaxy') return <GalaxyBackground />;

    if (mode === 'globe') return <GlobeBackground />;

    if (mode === 'custom' && customUrl) {
        return (
            <div
                className="fixed inset-0 z-[-1]"
                style={{
                    backgroundImage: `url(${customUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />
        );
    }

    return null;
};

export default BackgroundLayer;
