import { useEffect, useState } from 'react';
import { invoices as invoicesApi, customers } from '../api';
import type { Invoice, Customer } from '../types';

const statusColors: Record<string, string> = {
  DRAFT: 'text-gray-400 bg-gray-500/10', SENT: 'text-blue-400 bg-blue-500/10',
  PARTIAL: 'text-yellow-400 bg-yellow-500/10', PAID: 'text-green-400 bg-green-500/10',
  OVERDUE: 'text-red-400 bg-red-500/10', CANCELLED: 'text-gray-500 bg-gray-500/10',
};

export default function Invoices() {
  const [list, setList] = useState<Invoice[]>([]);
  const [cList, setCList] = useState<Customer[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'RECEIVABLE' | 'PAYABLE'>('all');
  const [showForm, setShowForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState<string | null>(null);
  const [form, setForm] = useState({ customerId: '', type: 'RECEIVABLE', subtotal: '', tax: '', dueDate: '', notes: '' });
  const [payForm, setPayForm] = useState({ amount: '', method: 'BANK_TRANSFER', reference: '' });
  const [summary, setSummary] = useState<Record<string, number>>({});

  const load = async () => {
    const [inv, cust, sum] = await Promise.all([
      invoicesApi.list(typeFilter === 'all' ? undefined : typeFilter),
      customers.list(),
      invoicesApi.summary(),
    ]);
    setList(inv); setCList(cust); setSummary(sum);
  };
  useEffect(() => { load(); }, [typeFilter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = parseFloat(form.subtotal); const tax = parseFloat(form.tax || '0');
    await invoicesApi.create({ ...form, subtotal: sub, tax, total: sub + tax, balance: sub + tax });
    setShowForm(false); load();
  };

  const addPayment = async (e: React.FormEvent, invoiceId: string) => {
    e.preventDefault();
    await invoicesApi.addPayment(invoiceId, { ...payForm, amount: parseFloat(payForm.amount) });
    setShowPayForm(null); load();
  };

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>🧾</span>Invoices</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
          {showForm ? 'Cancel' : '+ New Invoice'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total AR', value: fmt(summary.totalAR ?? 0), color: 'text-purple-400', icon: '📥' },
          { label: 'Total AP', value: fmt(summary.totalAP ?? 0), color: 'text-orange-400', icon: '📤' },
          { label: 'Total Revenue', value: fmt(summary.totalRevenue ?? 0), color: 'text-green-400', icon: '💵' },
          { label: 'Overdue Count', value: summary.overdueCount ?? 0, color: 'text-red-400', icon: '⚠️' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{c.label}</p>
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
              </div>
              <span className="text-2xl opacity-50">{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(['all','RECEIVABLE','PAYABLE'] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t === 'all' ? 'All' : t === 'RECEIVABLE' ? '📥 AR' : '📤 AP'}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Customer</label>
            <select value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Select customer…</option>
              {cList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="RECEIVABLE">Receivable (AR)</option>
              <option value="PAYABLE">Payable (AP)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Subtotal ($) *</label>
            <input required type="number" value={form.subtotal} onChange={e => setForm(p => ({ ...p, subtotal: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tax ($)</label>
            <input type="number" value={form.tax} onChange={e => setForm(p => ({ ...p, tax: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div className="col-span-2 md:col-span-3 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Create Invoice</button>
          </div>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-gray-500 border-b border-gray-800">
            {['Invoice #','Customer','Type','Total','Paid','Balance','Due Date','Status',''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-800/50">
            {list.length === 0 ? <tr><td colSpan={9} className="py-8 text-center text-gray-500">No invoices yet</td></tr>
            : list.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-800/30">
                <td className="px-4 py-3 font-mono text-xs text-blue-400">{inv.invoiceNo}</td>
                <td className="px-4 py-3 text-gray-300">{inv.customer?.name ?? '–'}</td>
                <td className="px-4 py-3 text-gray-400">{inv.type === 'RECEIVABLE' ? '📥 AR' : '📤 AP'}</td>
                <td className="px-4 py-3 text-white font-medium">{fmt(inv.total)}</td>
                <td className="px-4 py-3 text-green-400">{fmt(inv.paidAmount)}</td>
                <td className="px-4 py-3 text-yellow-400 font-semibold">{fmt(inv.balance)}</td>
                <td className="px-4 py-3 text-gray-400">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '–'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[inv.status] ?? 'text-gray-400 bg-gray-500/10'}`}>{inv.status}</span>
                </td>
                <td className="px-4 py-3">
                  {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                    <button onClick={() => setShowPayForm(inv.id)} className="text-xs text-blue-400 hover:text-blue-300">+ Payment</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPayForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <form onSubmit={e => addPayment(e, showPayForm)} className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-96 space-y-4">
            <h3 className="font-semibold text-white">Record Payment</h3>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Amount ($) *</label>
              <input required type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Method</label>
              <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                {['BANK_TRANSFER','CHECK','CASH','ACH','WIRE','CREDIT_CARD'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Reference</label>
              <input value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowPayForm(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium">Record Payment</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
