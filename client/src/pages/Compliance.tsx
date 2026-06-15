import { useEffect, useState } from 'react';
import { compliance as complianceApi } from '../api';

export default function Compliance() {
  const [records, setRecords] = useState<unknown[]>([]);
  const [score, setScore] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'CTPAT', entityType: 'carrier', entityId: '', score: '85', certificationNo: '', notes: '' });

  const load = async () => {
    const [r, s] = await Promise.all([complianceApi.list(), complianceApi.score()]);
    setRecords(r); setScore(s as Record<string,number>);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await complianceApi.create({ ...form, score: parseFloat(form.score) });
    setShowForm(false); load();
  };

  const scoreColor = (s: number) => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = (s: number) => s >= 80 ? 'from-green-500/20' : s >= 60 ? 'from-yellow-500/20' : 'from-red-500/20';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>✅</span>CTPAT / OEA Compliance</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
          {showForm ? 'Cancel' : '+ Add Record'}
        </button>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'CTPAT Score', value: score.ctpatScore ?? 0, icon: '🔐', desc: 'Customs Trade Partnership' },
          { label: 'OEA Score', value: score.oeaScore ?? 0, icon: '🏅', desc: 'Operador Económico Autorizado' },
          { label: 'Overall Compliance', value: score.overallScore ?? 0, icon: '✅', desc: `${score.totalRecords ?? 0} active records` },
        ].map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${scoreBg(c.value as number)} to-transparent bg-gray-900 border border-gray-800 rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">{c.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
              </div>
              <span className="text-3xl">{c.icon}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-5xl font-bold ${scoreColor(c.value as number)}`}>{c.value}</span>
              <span className="text-gray-500 text-xl mb-1">/100</span>
            </div>
            <div className="mt-3 bg-gray-800 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${c.value >= 80 ? 'bg-green-500' : c.value >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${c.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {['CTPAT','OEA','ISO_28000','TAPA','CUSTOMS_BOND'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Entity Type</label>
            <select value={form.entityType} onChange={e => setForm(p => ({ ...p, entityType: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {['carrier','driver','customer','warehouse'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Score (0-100)</label>
            <input type="number" min="0" max="100" value={form.score} onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Entity ID</label>
            <input value={form.entityId} onChange={e => setForm(p => ({ ...p, entityId: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Certification No.</label>
            <input value={form.certificationNo} onChange={e => setForm(p => ({ ...p, certificationNo: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div className="col-span-2 md:col-span-3 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Add Record</button>
          </div>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-gray-500 border-b border-gray-800">
            {['Type','Entity','Score','Certification','Status','Last Audit'].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-800/50">
            {records.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">No compliance records yet</td></tr>
            : (records as Array<Record<string,unknown>>).map(r => (
              <tr key={r.id as string} className="hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">{r.type as string}</span>
                </td>
                <td className="px-4 py-3 text-gray-300">{r.entityType as string} · <span className="font-mono text-xs">{(r.entityId as string).slice(0, 8)}…</span></td>
                <td className="px-4 py-3">
                  <span className={`text-lg font-bold ${scoreColor(r.score as number)}`}>{r.score as number}</span>
                  <span className="text-gray-500 text-xs">/100</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.certificationNo as string ?? '–'}</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">{r.status as string}</span></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.lastAuditDate ? new Date(r.lastAuditDate as string).toLocaleDateString() : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
