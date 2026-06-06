import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shipments as api } from '../api';
import StatusBadge from '../components/StatusBadge';
import type { Shipment } from '../types';

const TRANSITIONS: Record<string, string[]> = {
  PENDING:          ['PICKED_UP'],
  PICKED_UP:        ['IN_TRANSIT'],
  IN_TRANSIT:       ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
};

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');

  const load = () => api.get(id!).then(setShipment);
  useEffect(() => { load(); }, [id]);

  const advance = async (status: string) => {
    await api.updateStatus(id!, { status, note: note || undefined, location: location || undefined });
    setNote(''); setLocation('');
    load();
  };

  if (!shipment) return <div className="p-8 text-gray-500">Loading...</div>;

  const nextStatuses = TRANSITIONS[shipment.status] ?? [];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/shipments" className="text-gray-400 hover:text-gray-600 text-sm">← Shipments</Link>
        <span className="text-gray-300">/</span>
        <span className="font-mono text-sm font-medium">{shipment.trackingNo}</span>
        <StatusBadge status={shipment.status} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Shipment Info</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Order</dt><dd className="font-mono">{shipment.order.orderNo}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Customer</dt><dd>{shipment.order.customer.name}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Origin</dt><dd>{shipment.origin}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Destination</dt><dd>{shipment.destination}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Est. Distance</dt><dd>{shipment.estimatedDist ? `${shipment.estimatedDist} km` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Est. Time</dt><dd>{shipment.estimatedTime ? `${Math.round(shipment.estimatedTime / 60)}h ${shipment.estimatedTime % 60}m` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Weight</dt><dd>{shipment.order.weight} t</dd></div>
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Assignment</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Driver</dt><dd>{shipment.driver?.name ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">License</dt><dd className="font-mono">{shipment.driver?.licenseNo ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Vehicle</dt><dd className="font-mono">{shipment.vehicle?.plate ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Model</dt><dd>{shipment.vehicle ? `${shipment.vehicle.make} ${shipment.vehicle.model}` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Picked Up</dt><dd>{shipment.pickedUpAt ? new Date(shipment.pickedUpAt).toLocaleString() : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Delivered</dt><dd>{shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleString() : '—'}</dd></div>
          </dl>
        </div>
      </div>

      {nextStatuses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Update Status</h3>
          <div className="flex gap-3 items-end">
            <input placeholder="Location (optional)" value={location} onChange={e => setLocation(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {nextStatuses.map(s => (
              <button key={s} onClick={() => advance(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${s === 'FAILED' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}>
                Mark {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 mb-4">Timeline</h3>
        <div className="space-y-3">
          {(shipment.events ?? []).map((e, i) => (
            <div key={e.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full mt-1 ${i === (shipment.events?.length ?? 0) - 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                {i < (shipment.events?.length ?? 0) - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={e.status} />
                  {e.location && <span className="text-xs text-gray-500">@ {e.location}</span>}
                </div>
                {e.note && <p className="text-sm text-gray-600 mt-1">{e.note}</p>}
                <p className="text-xs text-gray-400 mt-1">{new Date(e.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {(shipment.events?.length ?? 0) === 0 && <p className="text-sm text-gray-400">No events recorded yet</p>}
        </div>
      </div>
    </div>
  );
}
