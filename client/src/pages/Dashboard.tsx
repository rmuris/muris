import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboard, analytics, ai, border, risk } from '../api';
import type { DashboardStats, AIPriority, BorderCrossing } from '../types';

interface KPI {
  label: string; value: string | number; sub?: string; color: string; icon: string; link?: string;
}

function KpiCard({ label, value, sub, color, icon, link }: KPI) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 hover:border-blue-500/50', yellow: 'text-yellow-400 hover:border-yellow-500/50',
    green: 'text-green-400 hover:border-green-500/50', purple: 'text-purple-400 hover:border-purple-500/50',
    red: 'text-red-400 hover:border-red-500/50', cyan: 'text-cyan-400 hover:border-cyan-500/50',
    indigo: 'text-indigo-400 hover:border-indigo-500/50', pink: 'text-pink-400 hover:border-pink-500/50',
    emerald: 'text-emerald-400 hover:border-emerald-500/50', orange: 'text-orange-400 hover:border-orange-500/50',
    teal: 'text-teal-400 hover:border-teal-500/50', slate: 'text-slate-300 hover:border-slate-500/50',
  };
  const cls = colorMap[color] ?? 'text-blue-400';
  const card = (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${cls} transition-colors group cursor-pointer`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-bold ${cls.split(' ')[0]}`}>{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">{icon}</span>
      </div>
    </div>
  );
  return link ? <Link to={link}>{card}</Link> : card;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${colors[priority] ?? colors.LOW}`}>{priority}</span>;
}

const AGENTS = [
  { type: 'EXECUTIVE', label: 'Executive', icon: '👔' },
  { type: 'DISPATCH', label: 'Dispatch', icon: '🚛' },
  { type: 'CUSTOMS', label: 'Customs', icon: '🛃' },
  { type: 'ACCOUNTING', label: 'CFO', icon: '💰' },
  { type: 'FLEET', label: 'Fleet', icon: '🔧' },
  { type: 'COMPLIANCE', label: 'Compliance', icon: '✅' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [priorities, setPriorities] = useState<AIPriority[]>([]);
  const [borders, setBorders] = useState<BorderCrossing[]>([]);
  const [riskData, setRiskData] = useState<Record<string, unknown>>({});
  const [agentOutput, setAgentOutput] = useState('');
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [kpi, setKpi] = useState<Record<string, number>>({});
  const [recentShipments, setRecentShipments] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboard.get(),
      ai.priorities(),
      border.list(),
      risk.score(),
      analytics.kpi(),
    ]).then(([dash, prio, bords, rs, kpiData]) => {
      setStats(dash.stats);
      setRecentShipments(dash.recentShipments ?? []);
      setPriorities(prio.priorities ?? []);
      setBorders((bords as BorderCrossing[]).slice(0, 4));
      setRiskData(rs as Record<string, unknown>);
      setKpi(kpiData as Record<string, number>);
    }).finally(() => setLoading(false));
  }, []);

  const runAgent = async (agentType: string) => {
    setRunningAgent(agentType);
    setAgentOutput('');
    try {
      const res = await ai.runAgent({ agentType, action: 'analyze' });
      setAgentOutput(res.output);
    } finally {
      setRunningAgent(null);
    }
  };

  const fmt = (n: number) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n.toFixed(0)}`;
  const riskLevel = (riskData.riskLevel as string) ?? 'LOW';
  const riskColors: Record<string, string> = { CRITICAL: 'text-red-400', HIGH: 'text-orange-400', MEDIUM: 'text-yellow-400', LOW: 'text-green-400' };
  const riskBg: Record<string, string> = { CRITICAL: 'border-red-500/30 bg-red-500/10', HIGH: 'border-orange-500/30 bg-orange-500/10', MEDIUM: 'border-yellow-500/30 bg-yellow-500/10', LOW: 'border-green-500/30 bg-green-500/10' };
  const statusColors: Record<string, string> = {
    DELIVERED: 'text-green-400 bg-green-500/10', IN_TRANSIT: 'text-blue-400 bg-blue-500/10',
    OUT_FOR_DELIVERY: 'text-yellow-400 bg-yellow-500/10', PICKED_UP: 'text-cyan-400 bg-cyan-500/10',
    PENDING: 'text-gray-400 bg-gray-500/10', FAILED: 'text-red-400 bg-red-500/10',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">AI Systems Initializing…</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400">⚡</span>AI Command Center
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${riskBg[riskLevel]}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${riskLevel === 'LOW' ? 'bg-green-400' : riskLevel === 'MEDIUM' ? 'bg-yellow-400' : 'bg-red-400'}`} />
          <span className={`text-sm font-semibold ${riskColors[riskLevel]}`}>Risk: {riskLevel}</span>
          <span className="text-gray-500 text-xs">({riskData.overallRiskScore as number ?? 0}/100)</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Active Loads" value={stats?.activeShipments ?? 0} sub="in transit" color="blue" icon="🚛" link="/shipments" />
        <KpiCard label="Open Orders" value={stats?.pendingOrders ?? 0} sub="awaiting dispatch" color="yellow" icon="📦" link="/orders" />
        <KpiCard label="Total Revenue" value={fmt(kpi.totalRevenue ?? 0)} sub="invoiced" color="green" icon="💵" link="/accounting" />
        <KpiCard label="AR Outstanding" value={fmt(stats?.totalAR ?? 0)} sub="receivable" color="purple" icon="🧾" link="/invoices" />
        <KpiCard label="Risk Events" value={riskData.openRiskEvents as number ?? 0} sub="open" color="red" icon="🛡️" link="/risk" />
        <KpiCard label="Avail. Drivers" value={stats?.availableDrivers ?? 0} sub={`${stats?.availableVehicles ?? 0} vehicles`} color="cyan" icon="👤" link="/fleet" />
        <KpiCard label="Carriers" value={stats?.totalCarriers ?? kpi.totalCarriers ?? 0} sub="active" color="indigo" icon="🏢" link="/carriers" />
        <KpiCard label="Customers" value={stats?.totalCustomers ?? kpi.totalCustomers ?? 0} sub="active" color="pink" icon="👥" link="/customers" />
        <KpiCard label="Delivered Today" value={stats?.deliveredToday ?? 0} sub="completed" color="emerald" icon="✅" link="/shipments" />
        <KpiCard label="Open Invoices" value={kpi.openInvoices ?? 0} sub="pending" color="orange" icon="⏳" link="/invoices" />
        <KpiCard label="Compliance" value={`${stats?.complianceScore ?? 0}%`} sub="CTPAT/OEA" color="teal" icon="🔒" link="/compliance" />
        <KpiCard label="Total Orders" value={stats?.totalOrders ?? 0} sub="all time" color="slate" icon="📊" link="/orders" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Priorities */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span>🎯</span>
            <h2 className="font-semibold text-white">AI Priority Recommendations</h2>
            <span className="text-xs text-gray-500 ml-auto">What to focus on today</span>
          </div>
          <div className="space-y-2">
            {priorities.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">All systems operational.</div>
            ) : priorities.map(p => (
              <Link key={p.rank} to={`/${p.module}`}>
                <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors border border-gray-700/50 mb-2">
                  <span className="text-gray-500 font-mono text-sm w-5">#{p.rank}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <PriorityBadge priority={p.priority} />
                      <span className="text-sm font-medium text-white">{p.title}</span>
                    </div>
                    <p className="text-xs text-gray-400">{p.action}</p>
                  </div>
                  <span className="text-gray-600 text-xs">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Border Intelligence */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span>🌎</span>
            <h2 className="font-semibold text-white">Border Intelligence</h2>
          </div>
          <div className="space-y-4">
            {borders.map(b => (
              <div key={b.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-300">{b.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${b.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{b.isOpen ? 'OPEN' : 'CLOSED'}</span>
                </div>
                <div className="space-y-1">
                  {[['NB', b.waitTimeNB], ['SB', b.waitTimeSB]].map(([dir, mins]) => {
                    const pct = Math.min(100, ((mins as number ?? 0) / 90) * 100);
                    const c = pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-yellow-500' : 'bg-green-500';
                    return (
                      <div key={dir as string} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 w-5">{dir}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                          <div className={`${c} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-gray-400 w-12 text-right">{mins ?? '–'} min</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <Link to="/border" className="block mt-4 text-center text-xs text-blue-400 hover:text-blue-300">View all crossings →</Link>
        </div>
      </div>

      {/* AI Agent Console */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span>🤖</span>
          <h2 className="font-semibold text-white">AI Agent Console</h2>
          <span className="text-xs text-gray-500 ml-auto">Click to run real-time analysis</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
          {AGENTS.map(agent => (
            <button key={agent.type} onClick={() => runAgent(agent.type)} disabled={runningAgent !== null}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all text-sm
                ${runningAgent === agent.type ? 'border-blue-400 bg-blue-500/10 text-blue-300' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-white'}
                disabled:opacity-50 disabled:cursor-not-allowed`}>
              <span className="text-xl">{agent.icon}</span>
              <span className="text-xs">{runningAgent === agent.type ? '⏳ Running…' : agent.label}</span>
            </button>
          ))}
        </div>
        {agentOutput && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Agent Output</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{agentOutput}</p>
          </div>
        )}
      </div>

      {/* Recent Shipments */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><span>🚛</span><h2 className="font-semibold text-white">Recent Shipments</h2></div>
          <Link to="/shipments" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                {['Tracking #','Customer','Route','Driver','Status'].map(h => <th key={h} className="text-left pb-2 font-medium pr-4">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {recentShipments.map(s => {
                const order = s.order as Record<string, unknown>;
                const customer = (order?.customer as Record<string, unknown>);
                const driver = s.driver as Record<string, unknown>;
                const status = s.status as string;
                return (
                  <tr key={s.id as string} className="hover:bg-gray-800/30">
                    <td className="py-2.5 pr-4">
                      <Link to={`/shipments/${s.id}`} className="text-blue-400 hover:text-blue-300 font-mono text-xs">{s.trackingNo as string}</Link>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-300">{customer?.name as string ?? '–'}</td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs">{s.origin as string} → {s.destination as string}</td>
                    <td className="py-2.5 pr-4 text-gray-400">{driver?.name as string ?? 'Unassigned'}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[status] ?? 'text-gray-400 bg-gray-500/10'}`}>
                        {status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {recentShipments.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-500 text-sm">No shipments yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
