import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboard } from '../api';
import StatusBadge from '../components/StatusBadge';
import type { DashboardStats, Shipment } from '../types';

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Shipment[]>([]);

  useEffect(() => {
    dashboard.get().then(d => { setStats(d.stats); setRecent(d.recentShipments); });
  }, []);

  if (!stats) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Orders" value={stats.totalOrders} />
        <StatCard label="Pending Orders" value={stats.pendingOrders} />
        <StatCard label="Active Shipments" value={stats.activeShipments} />
        <StatCard label="Delivered Today" value={stats.deliveredToday} />
        <StatCard label="Available Drivers" value={stats.availableDrivers} />
        <StatCard label="Available Vehicles" value={stats.availableVehicles} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">Recent Shipments</h3>
          <Link to="/shipments" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3">Tracking #</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Route</th>
              <th className="px-6 py-3">Driver</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(s => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-3 font-mono text-xs text-blue-600">
                  <Link to={`/shipments/${s.id}`}>{s.trackingNo}</Link>
                </td>
                <td className="px-6 py-3">{s.order.customer.name}</td>
                <td className="px-6 py-3 text-gray-500">{s.origin} → {s.destination}</td>
                <td className="px-6 py-3">{s.driver?.name ?? '—'}</td>
                <td className="px-6 py-3"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No shipments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
