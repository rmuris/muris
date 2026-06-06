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
        className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
        title="Manage columns"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        Columns
      </button>

      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 w-52 py-2">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">
            Show / Hide Columns
          </div>
          {columns.map(col => (
            <label
              key={col.key}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={visible.has(col.key)}
                onChange={() => onToggle(col.key)}
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700">{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
