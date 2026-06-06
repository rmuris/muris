import { useState, useRef, useEffect } from 'react';
import type { ColumnDef } from '../hooks/useColumnPrefs';

interface Props {
  columns: ColumnDef[];
  visible: Set<string>;
  onToggle: (key: string) => void;
}

export default function ColumnManager({ columns, visible, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-ghost flex items-center gap-2 text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        Columns
      </button>

      {open && (
        <div className="absolute right-0 mt-2 glass rounded-xl shadow-card z-30 w-52 py-2 border border-white/10">
          <div className="px-4 py-2 text-[10px] font-semibold text-brand-400 uppercase tracking-widest border-b border-white/5 mb-1">
            Show / Hide Columns
          </div>
          {columns.map(col => (
            <label
              key={col.key}
              className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={visible.has(col.key)}
                onChange={() => onToggle(col.key)}
                className="accent-brand-500 w-3.5 h-3.5"
              />
              <span className="text-sm text-brand-200">{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
