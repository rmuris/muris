import { useEffect, useState } from 'react';
import { ai } from '../api';
import type { AIAgentLog } from '../types';

const AGENTS = [
  { type: 'EXECUTIVE', label: 'Executive Agent', icon: '👔', desc: 'Strategic overview, revenue, priorities' },
  { type: 'DISPATCH', label: 'Dispatch Agent', icon: '🚛', desc: 'Load optimization, route analysis, delays' },
  { type: 'CUSTOMS', label: 'Customs Agent', icon: '🛃', desc: 'Pedimentos, Carta Porte, compliance' },
  { type: 'ACCOUNTING', label: 'CFO Agent', icon: '💰', desc: 'AR/AP, cash flow, collections' },
  { type: 'FLEET', label: 'Fleet Agent', icon: '🔧', desc: 'Maintenance, fuel, vehicle health' },
  { type: 'COMPLIANCE', label: 'Compliance Agent', icon: '✅', desc: 'CTPAT, OEA, document expiry' },
  { type: 'CUSTOMER_SUCCESS', label: 'Customer Agent', icon: '👥', desc: 'Upsell, churn risk, satisfaction' },
  { type: 'WAREHOUSE', label: 'Warehouse Agent', icon: '🏭', desc: 'Inventory, stockouts, capacity' },
  { type: 'SECURITY', label: 'Security Agent', icon: '🔐', desc: 'Fraud detection, CTPAT, access control' },
  { type: 'COLLECTIONS', label: 'Collections Agent', icon: '📬', desc: 'Overdue invoices, payment follow-up' },
];

export default function AIAgents() {
  const [logs, setLogs] = useState<AIAgentLog[]>([]);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [automations, setAutomations] = useState<unknown[]>([]);
  const [autoForm, setAutoForm] = useState({ name: '', trigger: '', condition: '', action: '' });
  const [showAutoForm, setShowAutoForm] = useState(false);
  const [tab, setTab] = useState<'agents' | 'automations' | 'logs'>('agents');

  const load = async () => {
    const [l, a] = await Promise.all([ai.agentLogs(), ai.automations()]);
    setLogs(l); setAutomations(a);
  };
  useEffect(() => { load(); }, []);

  const runAgent = async (agentType: string) => {
    setRunningAgent(agentType);
    try {
      const res = await ai.runAgent({ agentType, action: 'analyze' });
      setOutputs(p => ({ ...p, [agentType]: res.output }));
      load();
    } finally { setRunningAgent(null); }
  };

  const createAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    await ai.createAutomation(autoForm);
    setAutoForm({ name: '', trigger: '', condition: '', action: '' });
    setShowAutoForm(false); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>🤖</span>AI Agent Console</h1>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">10 Agents Online</span>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(['agents','automations','logs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t === 'agents' ? '🤖 Agents' : t === 'automations' ? '⚙️ Automations' : '📋 Logs'}
          </button>
        ))}
      </div>

      {tab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AGENTS.map(agent => (
            <div key={agent.type} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{agent.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white">{agent.label}</h3>
                    <p className="text-xs text-gray-400">{agent.desc}</p>
                  </div>
                </div>
                <button onClick={() => runAgent(agent.type)} disabled={runningAgent !== null}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${runningAgent === agent.type ? 'bg-blue-500/20 text-blue-300 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white'}
                    disabled:opacity-50`}>
                  {runningAgent === agent.type ? '⏳ Running…' : '▶ Run'}
                </button>
              </div>
              {outputs[agent.type] && (
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-xs text-green-400 font-semibold uppercase tracking-wider">Output</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{outputs[agent.type]}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'automations' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAutoForm(!showAutoForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
              {showAutoForm ? 'Cancel' : '+ Create Automation'}
            </button>
          </div>
          {showAutoForm && (
            <form onSubmit={createAutomation} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-white">New Automation Rule</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label className="text-xs text-gray-400 mb-1 block">Automation Name</label>
                  <input required value={autoForm.name} onChange={e => setAutoForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Auto-invoice on delivery"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-yellow-400 mb-1 block font-semibold">WHEN (trigger)</label>
                  <input required value={autoForm.trigger} onChange={e => setAutoForm(p => ({ ...p, trigger: e.target.value }))}
                    placeholder="e.g. shipment.DELIVERED"
                    className="w-full bg-gray-800 border border-yellow-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500" />
                </div>
                <div>
                  <label className="text-xs text-blue-400 mb-1 block font-semibold">IF (condition)</label>
                  <input value={autoForm.condition} onChange={e => setAutoForm(p => ({ ...p, condition: e.target.value }))}
                    placeholder="e.g. invoice.status = DRAFT"
                    className="w-full bg-gray-800 border border-blue-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-green-400 mb-1 block font-semibold">THEN (action)</label>
                  <input required value={autoForm.action} onChange={e => setAutoForm(p => ({ ...p, action: e.target.value }))}
                    placeholder="e.g. create_invoice + send_email"
                    className="w-full bg-gray-800 border border-green-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium">Create Automation</button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {(automations as Array<Record<string,unknown>>).map(a => (
              <div key={a.id as string} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">{a.name as string}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${a.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {a.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div><span className="text-yellow-400 font-semibold">WHEN</span><p className="text-gray-400 mt-0.5 font-mono">{a.trigger as string}</p></div>
                  {Boolean(a.condition) && <div><span className="text-blue-400 font-semibold">IF</span><p className="text-gray-400 mt-0.5 font-mono">{a.condition as string}</p></div>}
                  <div><span className="text-green-400 font-semibold">THEN</span><p className="text-gray-400 mt-0.5 font-mono">{a.action as string}</p></div>
                </div>
              </div>
            ))}
            {automations.length === 0 && <div className="py-12 text-center text-gray-500">No automations created yet</div>}
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b border-gray-800">
              {['Agent','Action','Status','Duration','Time'].map(h => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-800/50">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-gray-300 font-medium">{l.agentType}</td>
                  <td className="px-4 py-3 text-gray-400">{l.action}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${l.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{l.duration ? `${l.duration}ms` : '–'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-500">No agent activity yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
