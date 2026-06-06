import { useEffect, useState } from 'react';
import { orders as ordersApi, customers as customersApi } from '../api';
import StatusBadge from '../components/StatusBadge';
import ColumnManager from '../components/ColumnManager';
import { useColumnPrefs } from '../hooks/useColumnPrefs';
import type { Order, Customer } from '../types';

const COLUMNS = [
  { key: 'orderNo',      label: 'Order #' },
  { key: 'customer',     label: 'Customer' },
  { key: 'origin',       label: 'Origin' },
  { key: 'destination',  label: 'Destination' },
  { key: 'weight',       label: 'Weight' },
  { key: 'totalCost',    label: 'Cost' },
  { key: 'status',       label: 'Status' },
  { key: 'createdAt',    label: 'Created', defaultVisible: false },
];

const STATUS_FILTERS = ['', 'PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

const empty = { customerId: '', origin: '', destination: '', weight: '', description: '', totalCost: '' };

export default function Orders() {
  const [list, setList] = useState<Order[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const { visible, toggle, isVisible } = useColumnPrefs('orders', COLUMNS);

  const load = () => ordersApi.list(filterStatus ? { status: filterStatus } : {}).then(setList);
  useEffect(() => { load(); customersApi.list().then(setCustomerList); }, [filterStatus]);

  const save = async () => {
    await ordersApi.create({ ...form, weight: parseFloat(form.weight), totalCost: form.totalCost ? parseFloat(form.totalCost) : undefined });
    setForm(empty); setShowForm(false); load();
  };

  const del = async (id: string) => {
    if (confirm('Delete this order?')) { await ordersApi.delete(id); load(); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Orders</h1>
          <p className="text-brand-300 text-sm mt-0.5">{list.length} total orders</p>
        </div>
        <div className="flex gap-2">
          <ColumnManager columns={COLUMNS} visible={visible} onToggle={toggle} />
          <button onClick={() => setShowForm(true)} className="btn-primary">+ New Order</button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border ${
              filterStatus === s
                ? 'bg-gradient-brand text-white border-transparent shadow-brand'
                : 'bg-transparent border-white/10 text-brand-300 hover:border-brand-400 hover:text-white'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* New order form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 mb-6 shadow-card">
          <h3 className="font-heading font-semibold text-white mb-5">New Order</h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}
              className="input-dark col-span-2">
              <option value="">Select customer…</option>
              {customerList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {(['origin', 'destination', 'description'] as const).map(f => (
              <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                className="input-dark" />
            ))}
            <input placeholder="Weight (tons)" type="number" value={form.weight}
              onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} className="input-dark" />
            <input placeholder="Total cost ($)" type="number" value={form.totalCost}
              onChange={e => setForm(p => ({ ...p, totalCost: e.target.value }))} className="input-dark" />
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={save} className="btn-primary">Save Order</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {isVisible('orderNo')      && <th className="table-header text-left">Order #</th>}
                {isVisible('customer')     && <th className="table-header text-left">Customer</th>}
                {isVisible('origin')       && <th className="table-header text-left">Origin</th>}
                {isVisible('destination')  && <th className="table-header text-left">Destination</th>}
                {isVisible('weight')       && <th className="table-header text-left">Weight</th>}
                {isVisible('totalCost')    && <th className="table-header text-left">Cost</th>}
                {isVisible('status')       && <th className="table-header text-left">Status</th>}
                {isVisible('createdAt')    && <th className="table-header text-left">Created</th>}
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(o => (
                <tr key={o.id} className="table-row">
                  {isVisible('orderNo')      && <td className="table-cell font-mono text-xs text-brand-300">{o.orderNo}</td>}
                  {isVisible('customer')     && <td className="table-cell font-medium">{o.customer?.name}</td>}
                  {isVisible('origin')       && <td className="table-cell text-brand-400 text-xs">{o.origin}</td>}
                  {isVisible('destination')  && <td className="table-cell text-brand-400 text-xs">{o.destination}</td>}
                  {isVisible('weight')       && <td className="table-cell">{o.weight} t</td>}
                  {isVisible('totalCost')    && <td className="table-cell">{o.totalCost ? `$${o.totalCost.toLocaleString()}` : <span className="text-brand-500">—</span>}</td>}
                  {isVisible('status')       && <td className="table-cell"><StatusBadge status={o.status} /></td>}
                  {isVisible('createdAt')    && <td className="table-cell text-brand-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>}
                  <td className="table-cell text-right">
                    {o.status === 'PENDING' && (
                      <button onClick={() => del(o.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={COLUMNS.length + 1} className="px-6 py-12 text-center text-brand-400">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
