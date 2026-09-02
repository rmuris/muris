import type { ReactNode } from 'react';

/** A bracketed instrument panel with a small caption in the corner. */
export function HudPanel({
  label,
  children,
  className = '',
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hud-panel rounded-sm ${className}`}>
      {label && (
        <div className="px-3 pt-2 text-[10px] tracking-[0.25em] text-cyan-400/60 uppercase">{label}</div>
      )}
      {children}
    </div>
  );
}

/**
 * A radial gauge. `value` and `max` are shown numerically as well as by arc,
 * because an operator needs the number, not just the shape.
 */
export function Gauge({
  label,
  value,
  max,
  accent = 'cyan',
}: {
  label: string;
  value: number;
  max: number;
  accent?: 'cyan' | 'amber';
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const color = accent === 'amber' ? 'var(--hud-amber)' : 'var(--hud-cyan)';

  return (
    <div className="flex flex-col items-center gap-1" style={{ color }}>
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.15" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="-mt-[46px] mb-[22px] text-sm font-semibold tabular-nums hud-glow">{value}</div>
      <div className="text-[9px] tracking-[0.18em] uppercase text-cyan-400/55 text-center leading-tight">{label}</div>
    </div>
  );
}

/** Voice-level bars. Purely indicative — it animates while active. */
export function Waveform({ active, bars = 28 }: { active: boolean; bars?: number }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className={`w-[2px] rounded-full bg-cyan-300 ${active ? 'hud-bar' : ''}`}
          style={{
            height: active ? `${12 + ((i * 7) % 20)}px` : '2px',
            animationDelay: `${(i % 9) * 0.08}s`,
            opacity: active ? 0.85 : 0.25,
            transition: 'height 200ms ease, opacity 200ms ease',
          }}
        />
      ))}
    </div>
  );
}

/** A single readout row: label on the left, value right-aligned. */
export function Readout({ label, value, accent }: { label: string; value: string; accent?: 'amber' | 'red' }) {
  const color =
    accent === 'amber' ? 'text-amber-400' : accent === 'red' ? 'text-rose-400' : 'text-cyan-200';
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px] py-1 border-b border-cyan-400/10 last:border-0">
      <span className="tracking-[0.16em] uppercase text-cyan-400/50">{label}</span>
      <span className={`tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
