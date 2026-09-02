export type ReactorState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'degraded' | 'fault';

const RING_TEXT = 'MURIS · TRANSPORT MANAGEMENT SYSTEM · OPERATIONS INTELLIGENCE · ';

/** Ticks around the outer bezel, drawn as a dashed circle. */
function Bezel({ radius, opacity }: { radius: number; opacity: number }) {
  const circumference = 2 * Math.PI * radius;
  return (
    <circle
      cx="100"
      cy="100"
      r={radius}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeOpacity={opacity}
      strokeDasharray={`2 ${(circumference / 60 - 2).toFixed(2)}`}
    />
  );
}

/**
 * The reactor core. Its rings change speed and colour with the assistant's
 * state, so the operator can read what it is doing without looking at text.
 */
export default function ArcReactor({ state, size = 220 }: { state: ReactorState; size?: number }) {
  // Amber marks the offline core running — reduced capability, not a fault.
  const fault = state === 'fault';
  const degraded = state === 'degraded';
  const color = fault ? 'var(--hud-red)' : degraded ? 'var(--hud-amber)' : 'var(--hud-cyan)';
  const bloom = fault
    ? 'rgba(255,77,94,0.45)'
    : degraded
      ? 'rgba(255,176,32,0.38)'
      : 'rgba(56,225,255,0.4)';
  const coreMid = fault ? '#ff8a95' : degraded ? '#ffd88a' : '#9beeff';
  const coreEdge = fault ? '#ff4d5e' : degraded ? '#ffb020' : '#38e1ff';

  const outerSpin = state === 'thinking' ? 'hud-spin-fast' : 'hud-spin-slow';
  const innerSpin = state === 'thinking' ? 'hud-spin-fast' : 'hud-spin-med';
  const corePulse = state === 'listening' || state === 'speaking' ? 'hud-pulse-fast' : 'hud-pulse';

  return (
    <div className="relative" style={{ width: size, height: size, color }}>
      {/* Bloom behind the core */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl ${corePulse}`}
        style={{
          background: `radial-gradient(circle, ${bloom} 0%, transparent 65%)`,
        }}
      />

      <svg viewBox="0 0 200 200" className="relative w-full h-full">
        <defs>
          <radialGradient id="reactor-core">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor={coreMid} stopOpacity="0.85" />
            <stop offset="100%" stopColor={coreEdge} stopOpacity="0.15" />
          </radialGradient>
          <path
            id="reactor-ring-path"
            d="M 100,100 m -84,0 a 84,84 0 1,1 168,0 a 84,84 0 1,1 -168,0"
            fill="none"
          />
        </defs>

        {/* Outer bezel with rotating tick marks */}
        <g className={outerSpin}>
          <Bezel radius={94} opacity={0.5} />
        </g>

        {/* Rotating label ring */}
        <g className={outerSpin}>
          <text fontSize="7" letterSpacing="2.6" fill="currentColor" fillOpacity="0.65">
            <textPath href="#reactor-ring-path">{RING_TEXT}</textPath>
          </text>
        </g>

        {/* Segmented ring — arcs with gaps, counter-rotating */}
        <g className={innerSpin}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r="72"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.55"
              strokeLinecap="round"
              strokeDasharray="52 24"
              strokeDashoffset={i * 76}
              transform={`rotate(${i * 60} 100 100)`}
            />
          ))}
        </g>

        {/* Static inner housing */}
        <circle cx="100" cy="100" r="58" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" />

        {/* Coil segments, the reactor's characteristic spokes */}
        <g strokeOpacity="0.75">
          {Array.from({ length: 10 }, (_, i) => {
            const angle = (i * 36 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={100 + Math.cos(angle) * 38}
                y1={100 + Math.sin(angle) * 38}
                x2={100 + Math.cos(angle) * 54}
                y2={100 + Math.sin(angle) * 54}
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* The core itself */}
        <g className={corePulse} style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="34" fill="url(#reactor-core)" />
          <circle cx="100" cy="100" r="34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.9" />
          <circle cx="100" cy="100" r="20" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.7" />
        </g>
      </svg>
    </div>
  );
}
