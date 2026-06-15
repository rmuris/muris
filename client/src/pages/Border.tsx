import { useEffect, useState } from 'react';
import { border as borderApi } from '../api';
import type { BorderCrossing } from '../types';

export default function Border() {
  const [crossings, setCrossings] = useState<BorderCrossing[]>([]);

  useEffect(() => { borderApi.list().then(setCrossings); }, []);

  const getColor = (mins?: number) => {
    if (!mins) return { bar: 'bg-gray-500', text: 'text-gray-400', label: 'N/A' };
    if (mins > 60) return { bar: 'bg-red-500', text: 'text-red-400', label: 'Heavy' };
    if (mins > 30) return { bar: 'bg-yellow-500', text: 'text-yellow-400', label: 'Moderate' };
    return { bar: 'bg-green-500', text: 'text-green-400', label: 'Light' };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>🌎</span>Border Intelligence Center</h1>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Light (&lt;30 min)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500 inline-block" /> Moderate (30-60)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Heavy (&gt;60 min)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {crossings.map(b => {
          const nbColor = getColor(b.waitTimeNB);
          const sbColor = getColor(b.waitTimeSB);
          return (
            <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white text-base">{b.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{b.city} · {b.portType.toUpperCase()}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${b.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {b.isOpen ? '● OPEN' : '● CLOSED'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-gray-400">Northbound (→ USA)</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${nbColor.label !== 'N/A' ? nbColor.text : 'text-gray-500'}`}>{nbColor.label}</span>
                      <span className={`text-lg font-bold ${nbColor.text}`}>{b.waitTimeNB ?? '–'}</span>
                      <span className="text-xs text-gray-500">min</span>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-full h-3">
                    <div className={`${nbColor.bar} h-3 rounded-full transition-all`} style={{ width: `${Math.min(100, ((b.waitTimeNB ?? 0) / 90) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-gray-400">Southbound (→ MX)</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${sbColor.label !== 'N/A' ? sbColor.text : 'text-gray-500'}`}>{sbColor.label}</span>
                      <span className={`text-lg font-bold ${sbColor.text}`}>{b.waitTimeSB ?? '–'}</span>
                      <span className="text-xs text-gray-500">min</span>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-full h-3">
                    <div className={`${sbColor.bar} h-3 rounded-full transition-all`} style={{ width: `${Math.min(100, ((b.waitTimeSB ?? 0) / 90) * 100)}%` }} />
                  </div>
                </div>
              </div>

              {b.alerts && (
                <div className="mt-4 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <span className="text-yellow-400">⚠️</span>
                  <p className="text-xs text-yellow-300">{b.alerts}</p>
                </div>
              )}

              <p className="text-xs text-gray-600 mt-4">
                Last updated: {b.lastUpdated ? new Date(b.lastUpdated).toLocaleString() : 'Live CBP data'}
              </p>
            </div>
          );
        })}
        {crossings.length === 0 && <div className="col-span-2 py-12 text-center text-gray-500">Loading border data…</div>}
      </div>
    </div>
  );
}
