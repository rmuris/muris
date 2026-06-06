import { useEffect, useState } from 'react';
import { orders as ordersApi, customers as customersApi } from '../api';
import StatusBadge from '../components/StatusBadge';
import ColumnManager from '../components/ColumnManager';
import { useColumnPrefs } from '../hooks/useColumnPrefs';
import type { Order, Customer } from '../types';

const COLUMNS = [
  { key: 'orderNo',   label: 'Order #' },
  { key: 'customer',  label: 'Customer' },
  { key: 'origin',    label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  { key: 'weight',    label: 'Weight' },
  { key: 'totalCost', label: 'Cost' },
  { key: 'status',    label: 'Status' },
  { key: 'createdAt', label: 'Created', defaultVisible: false },
];

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
    if (confirm('Delete order?')) { await ordersApi.delete(id); load(); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Orders</h2>
        <div className="flex gap-2">
          <ColumnManager columns={COLUMNS} visible={visible} onToggle={toggle} />
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ New Order</button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {['', 'PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold mb-4">New Order</h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select customer...</option>
              {customerList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {(['origin', 'destination', 'description'] as const).map(f => (
              <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            ))}
            <input placeholder="Weight (tons)" type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Total cost ($)" type="number" value={form.totalCost} onChange={e => setForm(p => ({ ...p, totalCost: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              {isVisible('orderNo')    && <th className="px-6 py-3 font-medium">Order #</th>}
              {isVisible('customer')   && <th className="px-6 py-3 font-medium">Customer</th>}
              {isVisible('origin')     && <th className="px-6 py-3 font-medium">Origin</th>}
              {isVisible('destination')&& <th className="px-6 py-3 font-medium">Destination</th>}
              {isVisible('weight')     && <th className="px-6 py-3 font-medium">Weight</th>}
              {isVisible('totalCost')  && <th className="px-6 py-3 font-medium">Cost</th>}
              {isVisible('status')     && <th className="px-6 py-3 font-medium">Status</th>}
              {isVisible('createdAt')  && <th className="px-6 py-3 font-medium">Created</th>}
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map(o => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                {isVisible('orderNo')    && <td className="px-6 py-3 font-mono text-xs">{o.orderNo}</td>}
                {isVisible('customer')   && <td className="px-6 py-3">{o.customer?.name}</td>}
                {isVisible('origin')     && <td className="px-6 py-3 text-gray-500 text-xs">{o.origin}</td>}
                {isVisible('destination')&& <td className="px-6 py-3 text-gray-500 text-xs">{o.destination}</td>}
                {isVisible('weight')     && <td className="px-6 py-3">{o.weight} t</td>}
                {isVisible('totalCost')  && <td className="px-6 py-3">{o.totalCost ? `$${o.totalCost.toLocaleString()}` : '—'}</td>}
                {isVisible('status')     && <td className="px-6 py-3"><StatusBadge status={o.status} /></td>}
                {isVisible('createdAt')  && <td className="px-6 py-3 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>}
                <td className="px-6 py-3">
                  {o.status === 'PENDING' && (
                    <button onClick={() => del(o.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className="px-6 py-8 text-center text-gray-400">No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
