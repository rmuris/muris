import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { shipments as shipmentsApi, orders as ordersApi, fleet } from '../api';
import StatusBadge from '../components/StatusBadge';
import ColumnManager from '../components/ColumnManager';
import { useColumnPrefs } from '../hooks/useColumnPrefs';
import type { Shipment, Order, Driver, Vehicle } from '../types';

const COLUMNS = [
  { key: 'trackingNo',    label: 'Tracking #' },
  { key: 'customer',      label: 'Customer' },
  { key: 'origin',        label: 'Origin' },
  { key: 'destination',   label: 'Destination' },
  { key: 'driver',        label: 'Driver' },
  { key: 'vehicle',       label: 'Vehicle' },
  { key: 'estimatedDist', label: 'Est. Dist', defaultVisible: false },
  { key: 'estimatedTime', label: 'Est. Time', defaultVisible: false },
  { key: 'status',        label: 'Status' },
  { key: 'createdAt',     label: 'Created',   defaultVisible: false },
];

const STATUS_FILTERS = ['', 'PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Shipments</h1>
          <p className="text-brand-300 text-sm mt-0.5">{list.length} shipments</p>
        </div>
        <div className="flex gap-2">
          <ColumnManager columns={COLUMNS} visible={visible} onToggle={toggle} />
          <button onClick={() => setShowAssign(true)} className="btn-primary">+ Assign Shipment</button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      {/* Assign form */}
      {showAssign && (
        <div className="glass rounded-2xl p-6 mb-6 shadow-card">
          <h3 className="font-heading font-semibold text-white mb-5">Assign Shipment</h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={assignForm.orderId} onChange={e => setAssignForm(p => ({ ...p, orderId: e.target.value }))} className="input-dark">
              <option value="">Select pending order…</option>
              {pendingOrders.map(o => <option key={o.id} value={o.id}>{o.orderNo} — {o.customer?.name} ({o.origin} → {o.destination})</option>)}
            </select>
            <select value={assignForm.driverId} onChange={e => setAssignForm(p => ({ ...p, driverId: e.target.value }))} className="input-dark">
              <option value="">Select available driver…</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={assignForm.vehicleId} onChange={e => setAssignForm(p => ({ ...p, vehicleId: e.target.value }))} className="input-dark">
              <option value="">Select available vehicle…</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model}</option>)}
            </select>
            <input placeholder="Notes (optional)" value={assignForm.notes}
              onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} className="input-dark" />
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={assign} disabled={!assignForm.orderId || !assignForm.driverId || !assignForm.vehicleId}
              className="btn-primary disabled:opacity-40">Assign</button>
            <button onClick={() => setShowAssign(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {isVisible('trackingNo')    && <th className="table-header text-left">Tracking #</th>}
                {isVisible('customer')      && <th className="table-header text-left">Customer</th>}
                {isVisible('origin')        && <th className="table-header text-left">Origin</th>}
                {isVisible('destination')   && <th className="table-header text-left">Destination</th>}
                {isVisible('driver')        && <th className="table-header text-left">Driver</th>}
                {isVisible('vehicle')       && <th className="table-header text-left">Vehicle</th>}
                {isVisible('estimatedDist') && <th className="table-header text-left">Dist</th>}
                {isVisible('estimatedTime') && <th className="table-header text-left">Time</th>}
                {isVisible('status')        && <th className="table-header text-left">Status</th>}
                {isVisible('createdAt')     && <th className="table-header text-left">Created</th>}
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(s => (
                <tr key={s.id} className="table-row">
                  {isVisible('trackingNo')    && <td className="table-cell font-mono text-xs text-brand-300">{s.trackingNo}</td>}
                  {isVisible('customer')      && <td className="table-cell font-medium">{s.order?.customer?.name}</td>}
                  {isVisible('origin')        && <td className="table-cell text-brand-400 text-xs">{s.origin}</td>}
                  {isVisible('destination')   && <td className="table-cell text-brand-400 text-xs">{s.destination}</td>}
                  {isVisible('driver')        && <td className="table-cell">{s.driver?.name ?? <span className="text-brand-500">—</span>}</td>}
                  {isVisible('vehicle')       && <td className="table-cell font-mono text-xs">{s.vehicle?.plate ?? <span className="text-brand-500">—</span>}</td>}
                  {isVisible('estimatedDist') && <td className="table-cell">{s.estimatedDist ? `${s.estimatedDist} km` : '—'}</td>}
                  {isVisible('estimatedTime') && <td className="table-cell">{s.estimatedTime ? `${s.estimatedTime} min` : '—'}</td>}
                  {isVisible('status')        && <td className="table-cell"><StatusBadge status={s.status} /></td>}
                  {isVisible('createdAt')     && <td className="table-cell text-brand-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>}
                  <td className="table-cell text-right">
                    <Link to={`/shipments/${s.id}`} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                      Details →
                    </Link>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={COLUMNS.length + 1} className="px-6 py-12 text-center text-brand-400">No shipments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
