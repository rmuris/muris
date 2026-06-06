import { useState, useCallback } from 'react';

export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

export function useColumnPrefs(tableKey: string, columns: ColumnDef[]) {
  const storageKey = `tms_cols_${tableKey}`;

  const getInitialVisible = (): Set<string> => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set(columns.filter(c => c.defaultVisible !== false).map(c => c.key));
  };

  const [visible, setVisible] = useState<Set<string>>(getInitialVisible);

  const toggle = useCallback((key: string) => {
    setVisible(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }, [storageKey]);

  const isVisible = (key: string) => visible.has(key);
  const visibleColumns = columns.filter(c => visible.has(c.key));

  return { visible, toggle, isVisible, visibleColumns };
}
