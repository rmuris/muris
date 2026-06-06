import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { shipments as shipmentsApi, orders as ordersApi, fleet } from '../api';
import StatusBadge from '../components/StatusBadge';
import ColumnManager from '../components/ColumnManager';
import { useColumnPrefs } from '../hooks/useColumnPrefs';
import type { Shipment, Order, Driver, Vehicle } from '../types';

const COLUMNS = [
  { key: 'trackingNo',  label: 'Tracking #' },
  { key: 'customer',    label: 'Customer' },
  { key: 'origin',      label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  { key: 'driver',      label: 'Driver' },
  { key: 'vehicle',     label: 'Vehicle' },
  { key: 'estimatedDist', label: 'Est. Dist', defaultVisible: false },
  { key: 'estimatedTime', label: 'Est. Time', defaultVisible: false },
  { key: 'status',      label: 'Status' },
  { key: 'createdAt',   label: 'Created', defaultVisible: false },
];

export default function Shipments() {
  const [list, setList] = useState<Shipment[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ orderId: '', driverId: '', vehicleId: '', notes: '' });
  const [filterStatus, setFilterStatus] = useState('');
  const { visible, toggle, isVisible } = useColumnPrefs('shipments', COLUMNS);

  const load = () => shipmentsApi.list(filterStatus ? { status: filterStatus } : {}).then(setList);
  useEffect(() => { load(); }, [filterStatus]);
  useEffect(() => {
    ordersApi.list({ status: 'PENDING' }).then(setPendingOrders);
    fleet.drivers().then(d => setDrivers(d.filter(x => x.status === 'AVAILABLE')));
    fleet.vehicles().then(v => setVehicles(v.filter(x => x.status === 'AVAILABLE')));
  }, []);

  const assign = async () => {
    await shipmentsApi.assign(assignForm);
    setAssignForm({ orderId: '', driverId: '', vehicleId: '', notes: '' });
    setShowAssign(false);
    load();
    ordersApi.list({ status: 'PENDING' }).then(setPendingOrders);
  };

  const statuses = ['', 'PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Shipments</h2>
        <div className="flex gap-2">
          <ColumnManager columns={COLUMNS} visible={visible} onToggle={toggle} />
          <button onClick={() => setShowAssign(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Assign Shipment</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {showAssign && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold mb-4">Assign Shipment</h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={assignForm.orderId} onChange={e => setAssignForm(p => ({ ...p, orderId: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select pending order...</option>
              {pendingOrders.map(o => <option key={o.id} value={o.id}>{o.orderNo} — {o.customer.name} ({o.origin} → {o.destination})</option>)}
            </select>
            <select value={assignForm.driverId} onChange={e => setAssignForm(p => ({ ...p, driverId: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select available driver...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={assignForm.vehicleId} onChange={e => setAssignForm(p => ({ ...p, vehicleId: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select available vehicle...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model} ({v.capacity}t)</option>)}
            </select>
            <input placeholder="Notes (optional)" value={assignForm.notes} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={assign} disabled={!assignForm.orderId || !assignForm.driverId || !assignForm.vehicleId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Assign</button>
            <button onClick={() => setShowAssign(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              {isVisible('trackingNo')    && <th className="px-6 py-3 font-medium">Tracking #</th>}
              {isVisible('customer')      && <th className="px-6 py-3 font-medium">Customer</th>}
              {isVisible('origin')        && <th className="px-6 py-3 font-medium">Origin</th>}
              {isVisible('destination')   && <th className="px-6 py-3 font-medium">Destination</th>}
              {isVisible('driver')        && <th className="px-6 py-3 font-medium">Driver</th>}
              {isVisible('vehicle')       && <th className="px-6 py-3 font-medium">Vehicle</th>}
              {isVisible('estimatedDist') && <th className="px-6 py-3 font-medium">Est. Dist</th>}
              {isVisible('estimatedTime') && <th className="px-6 py-3 font-medium">Est. Time</th>}
              {isVisible('status')        && <th className="px-6 py-3 font-medium">Status</th>}
              {isVisible('createdAt')     && <th className="px-6 py-3 font-medium">Created</th>}
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                {isVisible('trackingNo')    && <td className="px-6 py-3 font-mono text-xs text-blue-600">{s.trackingNo}</td>}
                {isVisible('customer')      && <td className="px-6 py-3">{s.order?.customer?.name}</td>}
                {isVisible('origin')        && <td className="px-6 py-3 text-gray-500 text-xs">{s.origin}</td>}
                {isVisible('destination')   && <td className="px-6 py-3 text-gray-500 text-xs">{s.destination}</td>}
                {isVisible('driver')        && <td className="px-6 py-3">{s.driver?.name ?? '—'}</td>}
                {isVisible('vehicle')       && <td className="px-6 py-3 font-mono text-xs">{s.vehicle?.plate ?? '—'}</td>}
                {isVisible('estimatedDist') && <td className="px-6 py-3">{s.estimatedDist ? `${s.estimatedDist} km` : '—'}</td>}
                {isVisible('estimatedTime') && <td className="px-6 py-3">{s.estimatedTime ? `${s.estimatedTime} min` : '—'}</td>}
                {isVisible('status')        && <td className="px-6 py-3"><StatusBadge status={s.status} /></td>}
                {isVisible('createdAt')     && <td className="px-6 py-3 text-gray-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>}
                <td className="px-6 py-3">
                  <Link to={`/shipments/${s.id}`} className="text-blue-600 hover:underline text-xs">Details</Link>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className="px-6 py-8 text-center text-gray-400">No shipments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
