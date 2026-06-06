import { useEffect, useState } from 'react';
import { fleet as api } from '../api';
import StatusBadge from '../components/StatusBadge';
import type { Driver, Vehicle } from '../types';

const emptyDriver = { name: '', email: '', phone: '', licenseNo: '' };
const emptyVehicle = { plate: '', make: '', model: '', year: '', capacity: '', mileage: '0' };

export default function Fleet() {
  const [tab, setTab] = useState<'drivers' | 'vehicles'>('drivers');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverForm, setDriverForm] = useState(emptyDriver);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadDrivers = () => api.drivers().then(setDrivers);
  const loadVehicles = () => api.vehicles().then(setVehicles);
  useEffect(() => { loadDrivers(); loadVehicles(); }, []);

  const saveDriver = async () => {
    if (editingId) await api.updateDriver(editingId, driverForm);
    else await api.createDriver(driverForm);
    setDriverForm(emptyDriver); setEditingId(null); setShowForm(false); loadDrivers();
  };

  const saveVehicle = async () => {
    const data = { ...vehicleForm, year: parseInt(vehicleForm.year), capacity: parseFloat(vehicleForm.capacity), mileage: parseInt(vehicleForm.mileage) };
    if (editingId) await api.updateVehicle(editingId, data);
    else await api.createVehicle(data);
    setVehicleForm(emptyVehicle); setEditingId(null); setShowForm(false); loadVehicles();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Fleet Management</h2>
        <button onClick={() => { setShowForm(true); setEditingId(null); setDriverForm(emptyDriver); setVehicleForm(emptyVehicle); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + Add {tab === 'drivers' ? 'Driver' : 'Vehicle'}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['drivers', 'vehicles'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'}`}>
            {t === 'drivers' ? `Drivers (${drivers.length})` : `Vehicles (${vehicles.length})`}
          </button>
        ))}
      </div>

      {showForm && tab === 'drivers' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold mb-4">{editingId ? 'Edit' : 'New'} Driver</h3>
          <div className="grid grid-cols-2 gap-4">
            {(['name', 'email', 'phone', 'licenseNo'] as const).map(f => (
              <input key={f} placeholder={f === 'licenseNo' ? 'License No' : f.charAt(0).toUpperCase() + f.slice(1)}
                value={driverForm[f]} onChange={e => setDriverForm(p => ({ ...p, [f]: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveDriver} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {showForm && tab === 'vehicles' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold mb-4">{editingId ? 'Edit' : 'New'} Vehicle</h3>
          <div className="grid grid-cols-3 gap-4">
            {(['plate', 'make', 'model'] as const).map(f => (
              <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={vehicleForm[f]}
                onChange={e => setVehicleForm(p => ({ ...p, [f]: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            ))}
            <input placeholder="Year" type="number" value={vehicleForm.year} onChange={e => setVehicleForm(p => ({ ...p, year: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Capacity (tons)" type="number" value={vehicleForm.capacity} onChange={e => setVehicleForm(p => ({ ...p, capacity: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Mileage (km)" type="number" value={vehicleForm.mileage} onChange={e => setVehicleForm(p => ({ ...p, mileage: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveVehicle} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {tab === 'drivers' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">License</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Vehicle</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{d.name}</td>
                  <td className="px-6 py-3 font-mono text-xs">{d.licenseNo}</td>
                  <td className="px-6 py-3 text-gray-500">{d.phone ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-500">{d.vehicle ? `${d.vehicle.plate}` : '—'}</td>
                  <td className="px-6 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-6 py-3">
                    <button onClick={() => { setDriverForm({ name: d.name, email: d.email, phone: d.phone ?? '', licenseNo: d.licenseNo }); setEditingId(d.id); setShowForm(true); }}
                      className="text-blue-600 hover:underline text-xs">Edit</button>
                  </td>
                </tr>
              ))}
              {drivers.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No drivers yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'vehicles' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-6 py-3">Plate</th>
                <th className="px-6 py-3">Vehicle</th>
                <th className="px-6 py-3">Capacity</th>
                <th className="px-6 py-3">Mileage</th>
                <th className="px-6 py-3">Assigned Driver</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs font-medium">{v.plate}</td>
                  <td className="px-6 py-3">{v.year} {v.make} {v.model}</td>
                  <td className="px-6 py-3">{v.capacity} t</td>
                  <td className="px-6 py-3">{v.mileage.toLocaleString()} km</td>
                  <td className="px-6 py-3">{v.driver?.name ?? '—'}</td>
                  <td className="px-6 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-6 py-3">
                    <button onClick={() => { setVehicleForm({ plate: v.plate, make: v.make, model: v.model, year: String(v.year), capacity: String(v.capacity), mileage: String(v.mileage) }); setEditingId(v.id); setShowForm(true); }}
                      className="text-blue-600 hover:underline text-xs">Edit</button>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No vehicles yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
