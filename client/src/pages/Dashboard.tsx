import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboard } from '../api';
import StatusBadge from '../components/StatusBadge';
import type { DashboardStats, Shipment } from '../types';

const STAT_CONFIG = [
  { key: 'totalOrders',      label: 'Total Orders',      icon: '◈', color: 'from-brand-500/20 to-brand-700/10', iconColor: 'text-brand-300' },
  { key: 'pendingOrders',    label: 'Pending Orders',    icon: '◌', color: 'from-amber-500/20 to-amber-700/5',  iconColor: 'text-amber-400' },
  { key: 'activeShipments',  label: 'Active Shipments',  icon: '◉', color: 'from-accent/20 to-accent/5',        iconColor: 'text-blue-400' },
  { key: 'deliveredToday',   label: 'Delivered Today',   icon: '◎', color: 'from-emerald-500/20 to-emerald-700/5', iconColor: 'text-emerald-400' },
  { key: 'availableDrivers', label: 'Available Drivers', icon: '◐', color: 'from-indigo-500/20 to-indigo-700/5', iconColor: 'text-indigo-400' },
  { key: 'availableVehicles',label: 'Available Vehicles',icon: '◑', color: 'from-cyan-500/20 to-cyan-700/5',    iconColor: 'text-cyan-400' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Shipment[]>([]);

  useEffect(() => {
    dashboard.get().then(d => { setStats(d.stats); setRecent(d.recentShipments); });
  }, []);

  if (!stats) {
    return (
      <div className="p-8 flex items-center gap-3 text-brand-300">
        <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl text-white">Dashboard</h1>
        <p className="text-brand-300 text-sm mt-1">Welcome back — here's your operations overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {STAT_CONFIG.map(({ key, label, icon, color, iconColor }) => (
          <div key={key} className={`rounded-2xl p-5 bg-gradient-to-br ${color} border border-white/10 shadow-card backdrop-blur`}>
            <div className={`text-2xl mb-3 ${iconColor}`}>{icon}</div>
            <div className="font-heading font-bold text-2xl text-white">
              {stats[key as keyof DashboardStats]}
            </div>
            <div className="text-xs text-brand-300 mt-1 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent shipments */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-heading font-semibold text-white">Recent Shipments</h3>
          <Link to="/shipments" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="table-header text-left">Tracking #</th>
                <th className="table-header text-left">Customer</th>
                <th className="table-header text-left">Route</th>
                <th className="table-header text-left">Driver</th>
                <th className="table-header text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(s => (
                <tr key={s.id} className="table-row">
                  <td className="table-cell font-mono text-xs">
                    <Link to={`/shipments/${s.id}`} className="text-brand-300 hover:text-brand-200 transition-colors">
                      {s.trackingNo}
                    </Link>
                  </td>
                  <td className="table-cell">{s.order?.customer?.name}</td>
                  <td className="table-cell text-brand-400 text-xs">{s.origin} → {s.destination}</td>
                  <td className="table-cell">{s.driver?.name ?? <span className="text-brand-500">—</span>}</td>
                  <td className="table-cell"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-brand-400 text-sm">
                    No shipments yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
