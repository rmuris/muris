import { useEffect, useState } from 'react';
import { invoices as invoicesApi, analytics, ai } from '../api';

export default function Accounting() {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [kpi, setKpi] = useState<Record<string, number>>({});
  const [agentOutput, setAgentOutput] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    Promise.all([invoicesApi.summary(), analytics.kpi()]).then(([s, k]) => { setSummary(s); setKpi(k); });
  }, []);

  const runCFO = async () => {
    setRunning(true);
    try {
      const res = await ai.runAgent({ agentType: 'ACCOUNTING', action: 'cfo_analysis' });
      setAgentOutput(res.output);
    } finally { setRunning(false); }
  };

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const revenue = kpi.totalRevenue ?? 0;
  const collected = kpi.totalCollected ?? 0;
  const ar = summary.totalAR ?? 0;
  const ap = summary.totalAP ?? 0;
  const cashPosition = collected - ap;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>📈</span>CFO Dashboard</h1>
        <button onClick={runCFO} disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          <span>💰</span> {running ? 'Analyzing…' : 'Run CFO AI Analysis'}
        </button>
      </div>

      {agentOutput && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span>🤖</span><span className="text-sm font-semibold text-blue-400">CFO Agent Recommendations</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{agentOutput}</p>
        </div>
      )}

      {/* P&L Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-green-500/20 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Revenue</p>
          <p className="text-3xl font-bold text-green-400">{fmt(revenue)}</p>
          <p className="text-xs text-gray-500 mt-1">Total invoiced</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Collected</span><span className="text-green-400">{fmt(collected)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Outstanding AR</span><span className="text-yellow-400">{fmt(ar)}</span></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-red-500/20 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Payables</p>
          <p className="text-3xl font-bold text-red-400">{fmt(ap)}</p>
          <p className="text-xs text-gray-500 mt-1">Total AP outstanding</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Overdue Invoices</span><span className="text-red-400">{summary.overdueCount ?? 0}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Open Invoices</span><span className="text-orange-400">{kpi.openInvoices ?? 0}</span></div>
          </div>
        </div>
        <div className={`bg-gray-900 border rounded-xl p-5 ${cashPosition >= 0 ? 'border-green-500/20' : 'border-red-500/20'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Cash Position</p>
          <p className={`text-3xl font-bold ${cashPosition >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(cashPosition)}</p>
          <p className="text-xs text-gray-500 mt-1">Collected minus payables</p>
          <div className="mt-4">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Net Position</span>
              <span className={cashPosition >= 0 ? 'text-green-400' : 'text-red-400'}>{cashPosition >= 0 ? '✅ Positive' : '⚠️ Negative'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AR Aging Simulation */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><span>📅</span>AR Aging Analysis</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Current (0-30)', pct: 0.6, color: 'bg-green-500' },
            { label: '31-60 days', pct: 0.2, color: 'bg-yellow-500' },
            { label: '61-90 days', pct: 0.12, color: 'bg-orange-500' },
            { label: '90+ days', pct: 0.08, color: 'bg-red-500' },
          ].map(bucket => (
            <div key={bucket.label} className="text-center">
              <div className="text-sm text-gray-400 mb-2">{bucket.label}</div>
              <div className="bg-gray-800 rounded-full h-32 flex flex-col justify-end overflow-hidden mx-auto w-12">
                <div className={`${bucket.color} rounded-full transition-all`} style={{ height: `${bucket.pct * 100}%` }} />
              </div>
              <div className="text-sm font-semibold text-white mt-2">{fmt(ar * bucket.pct)}</div>
              <div className="text-xs text-gray-500">{(bucket.pct * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Ratios */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><span>📊</span>Key Financial Ratios</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Collection Rate', value: revenue > 0 ? `${((collected / revenue) * 100).toFixed(1)}%` : '–', color: 'text-green-400' },
            { label: 'Orders per Customer', value: kpi.totalCustomers ? (kpi.totalOrders / kpi.totalCustomers).toFixed(1) : '–', color: 'text-blue-400' },
            { label: 'Active Loads', value: kpi.activeShipments ?? 0, color: 'text-cyan-400' },
            { label: 'Available Drivers', value: kpi.availableDrivers ?? 0, color: 'text-indigo-400' },
          ].map(r => (
            <div key={r.label} className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">{r.label}</p>
              <p className={`text-2xl font-bold ${r.color}`}>{r.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
