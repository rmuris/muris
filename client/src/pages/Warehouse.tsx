import { useEffect, useState } from 'react';
import { warehouse as warehouseApi } from '../api';
import type { Warehouse } from '../types';

const typeColors: Record<string, string> = {
  GENERAL: 'text-blue-400 bg-blue-500/10', BONDED: 'text-purple-400 bg-purple-500/10',
  FTZ: 'text-indigo-400 bg-indigo-500/10', COLD_STORAGE: 'text-cyan-400 bg-cyan-500/10',
  HAZMAT: 'text-red-400 bg-red-500/10', CROSS_DOCK: 'text-orange-400 bg-orange-500/10',
};

export default function Warehouse() {
  const [list, setList] = useState<Warehouse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '', state: '', country: 'MX', type: 'GENERAL', sqft: '' });

  const load = () => warehouseApi.list().then(setList);
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await warehouseApi.create({ ...form, sqft: form.sqft ? parseFloat(form.sqft) : undefined });
    setShowForm(false); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>🏭</span>Warehouses</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
          {showForm ? 'Cancel' : '+ Add Warehouse'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'name', label: 'Name', required: true },
            { key: 'code', label: 'Code', required: true },
            { key: 'address', label: 'Address', required: true },
            { key: 'city', label: 'City', required: true },
            { key: 'state', label: 'State', required: true },
            { key: 'sqft', label: 'Sq Ft' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
              <input required={f.required} value={(form as Record<string,string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Country</label>
            <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="MX">Mexico</option><option value="US">USA</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {['GENERAL','BONDED','FTZ','COLD_STORAGE','HAZMAT','CROSS_DOCK'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Add Warehouse</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-gray-500">No warehouses yet</div>
        ) : list.map(w => (
          <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{w.name}</h3>
                <p className="text-xs text-gray-500 font-mono">{w.code}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${typeColors[w.type] ?? 'text-gray-400 bg-gray-500/10'}`}>{w.type}</span>
            </div>
            <p className="text-sm text-gray-400">{w.address}</p>
            <p className="text-xs text-gray-500">{w.city}, {w.state}, {w.country}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="text-center"><p className="text-lg font-bold text-blue-400">{w._count?.inventory ?? 0}</p><p className="text-xs text-gray-500">SKUs</p></div>
              <div className="text-center"><p className="text-lg font-bold text-green-400">{w._count?.locations ?? 0}</p><p className="text-xs text-gray-500">Locations</p></div>
              <div className="text-center"><p className="text-lg font-bold text-purple-400">{w.sqft ? `${(w.sqft/1000).toFixed(0)}K` : '–'}</p><p className="text-xs text-gray-500">Sq Ft</p></div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${w.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-400">{w.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
