const colors: Record<string, string> = {
  PENDING:           'bg-amber-500/15 text-amber-300 border-amber-500/20',
  ASSIGNED:          'bg-accent/15 text-blue-300 border-accent/20',
  IN_TRANSIT:        'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  OUT_FOR_DELIVERY:  'bg-brand-500/20 text-brand-300 border-brand-500/30',
  DELIVERED:         'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  CANCELLED:         'bg-red-500/15 text-red-400 border-red-500/20',
  FAILED:            'bg-red-500/15 text-red-400 border-red-500/20',
  PICKED_UP:         'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  AVAILABLE:         'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  ON_ROUTE:          'bg-accent/15 text-blue-300 border-accent/20',
  OFF_DUTY:          'bg-white/5 text-brand-400 border-white/10',
  IN_USE:            'bg-accent/15 text-blue-300 border-accent/20',
  MAINTENANCE:       'bg-orange-500/15 text-orange-300 border-orange-500/20',
  APPROVED:          'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  REJECTED:          'bg-red-500/15 text-red-400 border-red-500/20',
  IN_PROGRESS:       'bg-accent/15 text-blue-300 border-accent/20',
  COMPLETED:         'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge border ${colors[status] ?? 'bg-white/5 text-brand-400 border-white/10'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
