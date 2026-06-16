import { useEffect, useState } from 'react';
import { warehouse as warehouseApi } from '../api';
import type { InventoryItem, Warehouse } from '../types';

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ warehouseId: '', sku: '', description: '', quantity: '', unitOfMeasure: 'UNIT', weight: '', hsCode: '', countryOfOrigin: 'MX', unitValue: '' });

  const load = async () => {
    const [inv, wh] = await Promise.all([warehouseApi.inventory(), warehouseApi.list()]);
    setItems(inv); setWarehouses(wh);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await warehouseApi.createInventory({
      ...form,
      quantity: parseFloat(form.quantity),
      weight: form.weight ? parseFloat(form.weight) : undefined,
      unitValue: form.unitValue ? parseFloat(form.unitValue) : undefined,
    });
    setShowForm(false); load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await warehouseApi.deleteInventory(id);
    load();
  };

  const totalValue = items.reduce((sum, i) => sum + (i.totalValue ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><span>📋</span>Inventory</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total SKUs', value: items.length, color: 'text-blue-400' },
          { label: 'Total Items', value: items.reduce((s,i)=>s+i.quantity,0).toLocaleString(), color: 'text-green-400' },
          { label: 'Inventory Value', value: `$${totalValue.toLocaleString('en-US',{maximumFractionDigits:0})}`, color: 'text-purple-400' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Warehouse *</label>
            <select required value={form.warehouseId} onChange={e => setForm(p => ({ ...p, warehouseId: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Select…</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          {[
            { key: 'sku', label: 'SKU *', required: true },
            { key: 'description', label: 'Description *', required: true },
            { key: 'quantity', label: 'Quantity *', required: true },
            { key: 'weight', label: 'Weight (kg)' },
            { key: 'hsCode', label: 'HS Code' },
            { key: 'unitValue', label: 'Unit Value ($)' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
              <input required={f.required} value={(form as Record<string,string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Unit</label>
            <select value={form.unitOfMeasure} onChange={e => setForm(p => ({ ...p, unitOfMeasure: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {['UNIT','KG','TON','PALLET','BOX','EACH'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Add Item</button>
          </div>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-gray-500 border-b border-gray-800">
            {['SKU','Description','Warehouse','Qty','Unit','HS Code','Unit Value','Total Value',''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-800/50">
            {items.length === 0 ? <tr><td colSpan={9} className="py-8 text-center text-gray-500">No inventory items</td></tr>
            : items.map(item => (
              <tr key={item.id} className="hover:bg-gray-800/30">
                <td className="px-4 py-3 font-mono text-xs text-blue-400">{item.sku}</td>
                <td className="px-4 py-3 text-gray-300">{item.description}</td>
                <td className="px-4 py-3 text-gray-400">{item.warehouse?.name ?? '–'}</td>
                <td className="px-4 py-3 text-white font-semibold">{item.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-400">{item.unitOfMeasure}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.hsCode ?? '–'}</td>
                <td className="px-4 py-3 text-gray-300">{item.unitValue ? `$${item.unitValue.toFixed(2)}` : '–'}</td>
                <td className="px-4 py-3 text-green-400 font-semibold">{item.totalValue ? `$${item.totalValue.toLocaleString('en-US',{maximumFractionDigits:0})}` : '–'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => del(item.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
