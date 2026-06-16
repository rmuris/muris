import { useEffect, useState } from 'react';
import { quotes as quotesApi, customers } from '../api';
import type { Quote, Customer } from '../types';

const statusColors: Record<string, string> = {
  DRAFT: 'text-gray-400 bg-gray-500/10', SENT: 'text-blue-400 bg-blue-500/10',
  ACCEPTED: 'text-green-400 bg-green-500/10', REJECTED: 'text-red-400 bg-red-500/10',
  EXPIRED: 'text-orange-400 bg-orange-500/10', CONVERTED: 'text-purple-400 bg-purple-500/10',
};

export default function Quotes() {
  const [list, setList] = useState<Quote[]>([]);
  const [cList, setCList] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ customerId: '', origin: '', destination: '', weight: '', commodity: '', equipmentType: 'DRY_VAN' });

  const load = async () => {
    const [q, c] = await Promise.all([quotesApi.list(), customers.list()]);
    setList(q); setCList(c);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await quotesApi.create({ ...form, weight: form.weight ? parseFloat(form.weight) : undefined });
      setShowForm(false); load();
    } finally { setGenerating(false); }
  };

  const fmt = (n?: number) => n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '–';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>💰</span>AI Quoting Engine</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
          {showForm ? 'Cancel' : '🤖 Generate AI Quote'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gray-900 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span>🤖</span>
            <h2 className="font-semibold text-white">AI Rate Generation</h2>
            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Powered by AI</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Customer</label>
              <select value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Select customer…</option>
                {cList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Origin *</label>
              <input required value={form.origin} onChange={e => setForm(p => ({ ...p, origin: e.target.value }))} placeholder="Monterrey, MX"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Destination *</label>
              <input required value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} placeholder="Laredo, TX"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Weight (tons)</label>
              <input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Commodity</label>
              <input value={form.commodity} onChange={e => setForm(p => ({ ...p, commodity: e.target.value }))} placeholder="Auto parts, electronics…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Equipment</label>
              <select value={form.equipmentType} onChange={e => setForm(p => ({ ...p, equipmentType: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                {['DRY_VAN','REEFER','FLATBED','TANKER','CONTAINER'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={generating}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {generating ? '🤖 AI Generating…' : '🤖 Generate Rate'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-gray-500 border-b border-gray-800">
            {['Quote #','Customer','Lane','Equipment','Rate','Fuel','Total','Margin','AI','Status'].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-800/50">
            {list.length === 0 ? <tr><td colSpan={10} className="py-8 text-center text-gray-500">No quotes yet. Generate the first one!</td></tr>
            : list.map(q => (
              <tr key={q.id} className="hover:bg-gray-800/30">
                <td className="px-4 py-3 font-mono text-xs text-blue-400">{q.quoteNo}</td>
                <td className="px-4 py-3 text-gray-300">{q.customer?.name ?? '–'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{q.origin} → {q.destination}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{q.equipmentType ?? '–'}</td>
                <td className="px-4 py-3 text-white">{fmt(q.rate)}</td>
                <td className="px-4 py-3 text-gray-400">{fmt(q.fuelSurcharge)}</td>
                <td className="px-4 py-3 text-white font-semibold">{fmt(q.totalRate)}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-bold ${(q.marginPct ?? 0) >= 20 ? 'text-green-400' : (q.marginPct ?? 0) >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {q.marginPct?.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3">{q.aiGenerated ? <span className="text-xs text-blue-400">🤖 AI</span> : '–'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[q.status] ?? 'text-gray-400 bg-gray-500/10'}`}>{q.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
