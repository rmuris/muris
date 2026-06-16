import { useEffect, useState } from 'react';
import { customs as customsApi } from '../api';
import type { CustomsEntry, BorderCrossing } from '../types';

const statusColors: Record<string, string> = {
  DRAFT: 'text-gray-400 bg-gray-500/10', SUBMITTED: 'text-blue-400 bg-blue-500/10',
  APPROVED: 'text-green-400 bg-green-500/10', RELEASED: 'text-emerald-400 bg-emerald-500/10',
  EXAM: 'text-yellow-400 bg-yellow-500/10', HOLD: 'text-red-400 bg-red-500/10',
  REJECTED: 'text-red-500 bg-red-500/20', UNDER_REVIEW: 'text-purple-400 bg-purple-500/10',
};

export default function Customs() {
  const [tab, setTab] = useState<'entries' | 'cartaporte' | 'border'>('entries');
  const [entries, setEntries] = useState<CustomsEntry[]>([]);
  const [borders, setBorders] = useState<BorderCrossing[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'PEDIMENTO', direction: 'IMPORT', pedimentoNo: '', portOfEntry: '', brokerName: '', hsCode: '', commodityDesc: '', totalValue: '' });
  const [cartaForm, setCartaForm] = useState({ rfcEmisor: '', rfcReceptor: '', rfcTransportista: '', totalDistance: '', commodityCode: '', description: '', weight: '', vehiclePlate: '', driverLicense: '', insurancePolicy: '', insuranceCompany: '', unitCode: 'KGM' });
  const [cartaResult, setCartaResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [ent, bords] = await Promise.all([customsApi.entries(), customsApi.borderCrossings()]);
    setEntries(ent); setBorders(bords); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    await customsApi.createEntry({ ...form, totalValue: form.totalValue ? parseFloat(form.totalValue) : undefined });
    setShowForm(false); load();
  };

  const submitCarta = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await customsApi.createCartaPorte({
      ...cartaForm,
      totalDistance: cartaForm.totalDistance ? parseFloat(cartaForm.totalDistance) : undefined,
      weight: cartaForm.weight ? parseFloat(cartaForm.weight) : undefined,
    });
    setCartaResult(res);
  };

  const tabs = [
    { key: 'entries', label: 'Customs Entries', icon: '📄' },
    { key: 'cartaporte', label: 'Carta Porte', icon: '📋' },
    { key: 'border', label: 'Border Crossings', icon: '🌎' },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>🛃</span>Customs Operating System</h1>
        {tab === 'entries' && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
            {showForm ? 'Cancel' : '+ New Entry'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'entries' && (
        <>
          {showForm && (
            <form onSubmit={submitEntry} className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'type', label: 'Type', options: ['PEDIMENTO','ACE_ENTRY','EEI','DODA','CARTA_PORTE'] },
                { key: 'direction', label: 'Direction', options: ['IMPORT','EXPORT','IN_TRANSIT'] },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                  <select value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              {[
                { key: 'pedimentoNo', label: 'Pedimento No.' },
                { key: 'portOfEntry', label: 'Port of Entry' },
                { key: 'brokerName', label: 'Customs Broker' },
                { key: 'hsCode', label: 'HS Code' },
                { key: 'commodityDesc', label: 'Commodity Description' },
                { key: 'totalValue', label: 'Total Value ($)' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                  <input value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div className="col-span-2 md:col-span-3 flex justify-end">
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Create Entry</button>
              </div>
            </form>
          )}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b border-gray-800">
                {['Type','Direction','Pedimento/Entry','Port','Broker','Value','Score','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-800/50">
                {loading ? <tr><td colSpan={8} className="py-8 text-center text-gray-500">Loading…</td></tr>
                : entries.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-gray-500">No entries yet</td></tr>
                : entries.map(e => (
                  <tr key={e.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{e.type}</td>
                    <td className="px-4 py-3 text-gray-400">{e.direction}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{e.pedimentoNo ?? e.entryNo ?? '–'}</td>
                    <td className="px-4 py-3 text-gray-400">{e.portOfEntry ?? '–'}</td>
                    <td className="px-4 py-3 text-gray-400">{e.brokerName ?? '–'}</td>
                    <td className="px-4 py-3 text-gray-300">{e.totalValue ? `$${e.totalValue.toLocaleString()}` : '–'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${(e.complianceScore ?? 0) >= 80 ? 'text-green-400' : (e.complianceScore ?? 0) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {e.complianceScore ?? '–'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColors[e.status] ?? 'text-gray-400 bg-gray-500/10'}`}>{e.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'cartaporte' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><span>🤖</span>AI Carta Porte Validator</h2>
            <form onSubmit={submitCarta} className="space-y-3">
              {[
                { key: 'rfcEmisor', label: 'RFC Emisor', ph: 'XAXX010101000' },
                { key: 'rfcReceptor', label: 'RFC Receptor', ph: 'XAXX010101000' },
                { key: 'rfcTransportista', label: 'RFC Transportista', ph: 'XAXX010101000' },
                { key: 'totalDistance', label: 'Distance (km)', ph: '450' },
                { key: 'commodityCode', label: 'SAT Commodity Code', ph: '24100901' },
                { key: 'unitCode', label: 'SAT Unit Code', ph: 'KGM' },
                { key: 'description', label: 'Description', ph: 'General cargo' },
                { key: 'weight', label: 'Weight (kg)', ph: '15000' },
                { key: 'vehiclePlate', label: 'Vehicle Plate', ph: 'ABC1234' },
                { key: 'driverLicense', label: 'Driver License', ph: 'XXXXXXXXXX' },
                { key: 'insurancePolicy', label: 'Insurance Policy', ph: 'POL-12345' },
                { key: 'insuranceCompany', label: 'Insurance Company', ph: 'GNP Seguros' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                  <input value={(cartaForm as Record<string, string>)[f.key]} placeholder={f.ph}
                    onChange={e => setCartaForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono" />
                </div>
              ))}
              <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
                Run AI Validation (200+ checks)
              </button>
            </form>
          </div>

          {cartaResult && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Validation Results</h2>
              <div className={`text-center py-4 mb-4 rounded-lg ${(cartaResult.cartaPorte as Record<string,unknown>)?.status === 'VALID' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className={`text-4xl font-bold mb-1 ${(cartaResult.cartaPorte as Record<string,unknown>)?.status === 'VALID' ? 'text-green-400' : 'text-red-400'}`}>
                  {(cartaResult.complianceScore as number ?? 0).toFixed(0)}%
                </div>
                <div className={`text-sm font-semibold ${(cartaResult.cartaPorte as Record<string,unknown>)?.status === 'VALID' ? 'text-green-400' : 'text-red-400'}`}>
                  {(cartaResult.cartaPorte as Record<string,unknown>)?.status === 'VALID' ? '✅ CARTA PORTE VALID' : '❌ CARTA PORTE INVALID'}
                </div>
              </div>
              {(cartaResult.errors as string[] ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Issues Found:</p>
                  {(cartaResult.errors as string[]).map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-red-300 bg-red-500/5 border border-red-500/20 rounded p-2">
                      <span>⚠️</span><span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'border' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {borders.map(b => (
            <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">{b.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${b.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {b.isOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <div className="space-y-3">
                {[['Northbound (USA)', b.waitTimeNB], ['Southbound (MX)', b.waitTimeSB]].map(([label, mins]) => {
                  const pct = Math.min(100, ((mins as number ?? 0) / 90) * 100);
                  const color = pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-yellow-500' : 'bg-green-500';
                  const textColor = pct > 70 ? 'text-red-400' : pct > 40 ? 'text-yellow-400' : 'text-green-400';
                  return (
                    <div key={label as string}>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{label}</span>
                        <span className={textColor}>{mins ?? '–'} min</span>
                      </div>
                      <div className="bg-gray-800 rounded-full h-2">
                        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {b.alerts && <p className="text-xs text-yellow-400 mt-3 bg-yellow-500/10 rounded p-2">{b.alerts}</p>}
            </div>
          ))}
          {borders.length === 0 && <div className="col-span-3 py-12 text-center text-gray-500">No border crossing data</div>}
        </div>
      )}
    </div>
  );
}
