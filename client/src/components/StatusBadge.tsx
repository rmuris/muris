const colors: Record<string, string> = {
  PENDING:           'bg-yellow-100 text-yellow-800',
  ASSIGNED:          'bg-blue-100 text-blue-800',
  IN_TRANSIT:        'bg-indigo-100 text-indigo-800',
  OUT_FOR_DELIVERY:  'bg-purple-100 text-purple-800',
  DELIVERED:         'bg-green-100 text-green-800',
  CANCELLED:         'bg-red-100 text-red-800',
  FAILED:            'bg-red-100 text-red-800',
  PICKED_UP:         'bg-cyan-100 text-cyan-800',
  AVAILABLE:         'bg-green-100 text-green-800',
  ON_ROUTE:          'bg-blue-100 text-blue-800',
  OFF_DUTY:          'bg-gray-100 text-gray-600',
  IN_USE:            'bg-blue-100 text-blue-800',
  MAINTENANCE:       'bg-orange-100 text-orange-800',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
