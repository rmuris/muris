import { useEffect, useState } from 'react';
import { carriers as carriersApi } from '../api';
import type { Carrier } from '../types';

const statusColors: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-500/10',
  INACTIVE: 'text-gray-400 bg-gray-500/10',
  SUSPENDED: 'text-red-400 bg-red-500/10',
  PENDING_VERIFICATION: 'text-yellow-400 bg-yellow-500/10',
};

export default function Carriers() {
  const [list, setList] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', mc: '', dot: '', rfc: '', email: '', phone: '', country: 'MX', type: 'ASSET' });
  const [saving, setSaving] = useState(false);

  const load = () => carriersApi.list().then(d => { setList(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await carriersApi.create(form);
      setForm({ name: '', mc: '', dot: '', rfc: '', email: '', phone: '', country: 'MX', type: 'ASSET' });
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this carrier?')) return;
    await carriersApi.delete(id);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>🏢</span>Carriers</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
          {showForm ? 'Cancel' : '+ Add Carrier'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'name', label: 'Company Name', required: true },
            { key: 'mc', label: 'MC Number' },
            { key: 'dot', label: 'DOT Number' },
            { key: 'rfc', label: 'RFC' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
              <input required={f.required} value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {['ASSET','BROKER','INTERMODAL'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Country</label>
            <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="MX">Mexico</option>
              <option value="US">USA</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Carrier'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-900/80">
              {['Carrier','MC/DOT','RFC','Type','Country','Risk Score','Status',''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-gray-500">Loading…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-gray-500">No carriers yet</td></tr>
            ) : list.map(c => (
              <tr key={c.id} className="hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{c.name}</div>
                  {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                  {c.mc ? `MC: ${c.mc}` : ''}{c.mc && c.dot ? ' / ' : ''}{c.dot ? `DOT: ${c.dot}` : ''}
                  {!c.mc && !c.dot && '–'}
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.rfc ?? '–'}</td>
                <td className="px-4 py-3 text-gray-400">{c.type}</td>
                <td className="px-4 py-3 text-gray-400">{c.country}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5 w-16">
                      <div className={`h-1.5 rounded-full ${(c.riskScore ?? 50) > 70 ? 'bg-red-500' : (c.riskScore ?? 50) > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${c.riskScore ?? 50}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{c.riskScore ?? 50}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[c.status] ?? 'text-gray-400 bg-gray-500/10'}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => del(c.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
