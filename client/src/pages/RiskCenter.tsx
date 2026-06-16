import { useEffect, useState } from 'react';
import { risk as riskApi } from '../api';
import type { RiskEvent } from '../types';

const sevColors: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  LOW: 'text-green-400 bg-green-500/10 border-green-500/30',
};

export default function RiskCenter() {
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [score, setScore] = useState<Record<string, unknown>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'FRAUD_DETECTED', severity: 'HIGH', title: '', description: '', entityType: '', entityId: '' });

  const load = async () => {
    const [ev, sc] = await Promise.all([riskApi.events(), riskApi.score()]);
    setEvents(ev); setScore(sc);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await riskApi.createEvent(form);
    setShowForm(false); load();
  };

  const resolve = async (id: string) => {
    await riskApi.resolveEvent(id);
    load();
  };

  const riskLevel = score.riskLevel as string ?? 'LOW';
  const scoreNum = score.overallRiskScore as number ?? 0;
  const scoreColor = scoreNum > 70 ? 'text-red-400' : scoreNum > 40 ? 'text-orange-400' : scoreNum > 20 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>🛡️</span>Risk Center</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
          {showForm ? 'Cancel' : '+ Log Risk Event'}
        </button>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Risk Score', value: `${scoreNum}/100`, color: scoreColor, icon: '🎯' },
          { label: 'Risk Level', value: riskLevel, color: scoreColor, icon: '⚠️' },
          { label: 'Open Events', value: score.openRiskEvents as number ?? 0, color: 'text-white', icon: '📋' },
          { label: 'Critical Events', value: score.criticalEvents as number ?? 0, color: 'text-red-400', icon: '🔴' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <span className="text-xl opacity-50 mt-1 block">{c.icon}</span>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Event Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {['FRAUD_DETECTED','INSURANCE_EXPIRED','COMPLIANCE_VIOLATION','PAYMENT_DEFAULT','CUSTOMS_HOLD','SECURITY_INCIDENT','CARGO_DAMAGE','THEFT','ACCIDENT'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Severity</label>
            <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Title *</label>
            <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Log Event</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl py-12 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-gray-400">No risk events. All systems clear.</p>
          </div>
        ) : events.map(ev => (
          <div key={ev.id} className={`bg-gray-900 border rounded-xl p-4 ${ev.status === 'OPEN' ? `border-l-4 ${sevColors[ev.severity]?.includes('red') ? 'border-l-red-500' : sevColors[ev.severity]?.includes('orange') ? 'border-l-orange-500' : sevColors[ev.severity]?.includes('yellow') ? 'border-l-yellow-500' : 'border-l-green-500'} border-gray-800` : 'border-gray-800 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${sevColors[ev.severity] ?? sevColors.LOW}`}>{ev.severity}</span>
                <div>
                  <p className="text-white font-medium text-sm">{ev.title}</p>
                  {ev.description && <p className="text-gray-400 text-xs mt-0.5">{ev.description}</p>}
                  <p className="text-gray-500 text-xs mt-1">{ev.type} · {new Date(ev.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${ev.status === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{ev.status}</span>
                {ev.status === 'OPEN' && (
                  <button onClick={() => resolve(ev.id)} className="text-xs text-green-400 hover:text-green-300 border border-green-500/30 px-2 py-0.5 rounded">Resolve</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
