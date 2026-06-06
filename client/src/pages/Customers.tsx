import { useEffect, useState } from 'react';
import { customers as api } from '../api';
import type { Customer } from '../types';

const empty = { name: '', email: '', phone: '', address: '' };

export default function Customers() {
  const [list, setList] = useState<Customer[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.list().then(setList);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing) await api.update(editing, form);
    else await api.create(form);
    setForm(empty); setEditing(null); setShowForm(false); load();
  };

  const edit = (c: Customer) => { setForm({ name: c.name, email: c.email, phone: c.phone ?? '', address: c.address ?? '' }); setEditing(c.id); setShowForm(true); };
  const del = async (id: string) => { if (confirm('Delete customer?')) { await api.delete(id); load(); } };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Customers</h2>
        <button onClick={() => { setForm(empty); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ New Customer</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold mb-4">{editing ? 'Edit' : 'New'} Customer</h3>
          <div className="grid grid-cols-2 gap-4">
            {(['name', 'email', 'phone', 'address'] as const).map(f => (
              <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3">Orders</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{c.name}</td>
                <td className="px-6 py-3 text-gray-500">{c.email}</td>
                <td className="px-6 py-3 text-gray-500">{c.phone ?? '—'}</td>
                <td className="px-6 py-3">{c._count?.orders ?? 0}</td>
                <td className="px-6 py-3 flex gap-2">
                  <button onClick={() => edit(c)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => del(c.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No customers yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
