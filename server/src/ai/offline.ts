import prisma from '../db';

/**
 * A small deterministic core used when ANTHROPIC_API_KEY is not set, so the
 * HUD is usable out of the box. It answers a handful of common operational
 * questions from the database and is explicit that it is not the real
 * assistant — it has no reasoning, no tools, and no agent authoring.
 */

const OFFLINE_NOTE =
  '\n\n— Offline core. Set ANTHROPIC_API_KEY in server/.env and restart for the full assistant.';

function matches(input: string, ...terms: string[]) {
  const q = input.toLowerCase();
  return terms.some(t => q.includes(t));
}

export async function offlineReply(input: string): Promise<string> {
  if (matches(input, 'status', 'dashboard', 'overview', 'resumen', 'estado', 'how are we', 'situation')) {
    const [orders, pending, active, drivers, vehicles] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.shipment.count({ where: { status: { in: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } } }),
      prisma.driver.count({ where: { status: 'AVAILABLE' } }),
      prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
    ]);
    return (
      `${orders} orders on file, ${pending} still unassigned. ${active} shipments in motion. ` +
      `${drivers} drivers and ${vehicles} vehicles available.${OFFLINE_NOTE}`
    );
  }

  if (matches(input, 'shipment', 'transit', 'envio', 'envío', 'carga')) {
    const shipments = await prisma.shipment.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { driver: { select: { name: true } } },
    });
    if (!shipments.length) return `No shipments on record.${OFFLINE_NOTE}`;
    return (
      'Most recent shipments:\n' +
      shipments
        .map(s => `${s.trackingNo} · ${s.origin} → ${s.destination} · ${s.status} · ${s.driver?.name ?? 'unassigned'}`)
        .join('\n') +
      OFFLINE_NOTE
    );
  }

  if (matches(input, 'driver', 'conductor', 'chofer', 'operador')) {
    const drivers = await prisma.driver.findMany({ orderBy: { name: 'asc' }, take: 10 });
    if (!drivers.length) return `No drivers on the roster.${OFFLINE_NOTE}`;
    return 'Drivers:\n' + drivers.map(d => `${d.name} · ${d.status}`).join('\n') + OFFLINE_NOTE;
  }

  if (matches(input, 'vehicle', 'truck', 'fleet', 'camion', 'camión', 'flota', 'unidad')) {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { plate: 'asc' }, take: 10 });
    if (!vehicles.length) return `No vehicles on the fleet.${OFFLINE_NOTE}`;
    return (
      'Fleet:\n' +
      vehicles.map(v => `${v.plate} · ${v.make} ${v.model} · ${v.capacity}t · ${v.status}`).join('\n') +
      OFFLINE_NOTE
    );
  }

  if (matches(input, 'order', 'pedido', 'orden')) {
    const orders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } } },
    });
    if (!orders.length) return `No orders on file.${OFFLINE_NOTE}`;
    return (
      'Latest orders:\n' +
      orders.map(o => `${o.orderNo} · ${o.customer.name} · ${o.origin} → ${o.destination} · ${o.status}`).join('\n') +
      OFFLINE_NOTE
    );
  }

  if (matches(input, 'agent', 'agente')) {
    const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } });
    const roster = agents.length
      ? 'On the roster:\n' + agents.map(a => `${a.name} · ${a.role} · ${a.status}`).join('\n')
      : 'No agents on the roster yet.';
    return `${roster}\n\nForging new agents needs the full assistant.${OFFLINE_NOTE}`;
  }

  return (
    'Offline core. I can report on the dashboard, orders, shipments, drivers, vehicles and the agent roster — ' +
    'ask about any of those. Reasoning, dispatch and agent authoring need a Claude API key.' +
    OFFLINE_NOTE
  );
}
