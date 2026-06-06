import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

function generateTrackingNo() {
  return `TRK-${Date.now().toString(36).toUpperCase()}`;
}

// Rough distance estimate (Haversine not needed for MVP — use straight-line km)
function estimateRoute(origin: string, destination: string) {
  // In a real TMS, call a routing API. For MVP, return placeholder values.
  return { estimatedDist: Math.round(50 + Math.random() * 450), estimatedTime: Math.round(60 + Math.random() * 480) };
}

const AssignSchema = z.object({
  orderId: z.string(),
  driverId: z.string(),
  vehicleId: z.string(),
  notes: z.string().optional(),
});

const StatusSchema = z.object({
  status: z.enum(['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED']),
  note: z.string().optional(),
  location: z.string().optional(),
});

router.get('/', async (req, res) => {
  const { status } = req.query;
  const shipments = await prisma.shipment.findMany({
    where: status ? { status: String(status) } : {},
    include: {
      order: { include: { customer: true } },
      driver: true,
      vehicle: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(shipments);
});

router.get('/:id', async (req, res) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: req.params.id },
    include: {
      order: { include: { customer: true } },
      driver: true,
      vehicle: true,
      events: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!shipment) return res.status(404).json({ error: 'Not found' });
  res.json(shipment);
});

router.get('/track/:trackingNo', async (req, res) => {
  const shipment = await prisma.shipment.findUnique({
    where: { trackingNo: req.params.trackingNo },
    include: {
      order: { include: { customer: true } },
      driver: true,
      events: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!shipment) return res.status(404).json({ error: 'Tracking number not found' });
  res.json(shipment);
});

// Assign driver + vehicle to an order, creating the shipment
router.post('/assign', async (req, res) => {
  const parsed = AssignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { orderId, driverId, vehicleId, notes } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { estimatedDist, estimatedTime } = estimateRoute(order.origin, order.destination);

  const [shipment] = await prisma.$transaction([
    prisma.shipment.create({
      data: {
        trackingNo: generateTrackingNo(),
        orderId,
        driverId,
        vehicleId,
        origin: order.origin,
        destination: order.destination,
        estimatedDist,
        estimatedTime,
        notes,
        status: 'PENDING',
      },
      include: { order: { include: { customer: true } }, driver: true, vehicle: true },
    }),
    prisma.order.update({ where: { id: orderId }, data: { status: 'ASSIGNED' } }),
    prisma.driver.update({ where: { id: driverId }, data: { status: 'ON_ROUTE' } }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'IN_USE' } }),
  ]);

  res.status(201).json(shipment);
});

// Update shipment status
router.post('/:id/status', async (req, res) => {
  const parsed = StatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { status, note, location } = parsed.data;

  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id } });
  if (!shipment) return res.status(404).json({ error: 'Not found' });

  const now = new Date();
  const updates: Record<string, unknown> = { status };
  if (status === 'PICKED_UP') updates.pickedUpAt = now;
  if (status === 'DELIVERED') {
    updates.deliveredAt = now;
    // Free driver and vehicle
    if (shipment.driverId) await prisma.driver.update({ where: { id: shipment.driverId }, data: { status: 'AVAILABLE' } });
    if (shipment.vehicleId) await prisma.vehicle.update({ where: { id: shipment.vehicleId }, data: { status: 'AVAILABLE' } });
    await prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'DELIVERED' } });
  }

  const [updated] = await prisma.$transaction([
    prisma.shipment.update({ where: { id: req.params.id }, data: updates, include: { events: { orderBy: { createdAt: 'asc' } } } }),
    prisma.shipmentEvent.create({ data: { shipmentId: req.params.id, status, note, location } }),
  ]);

  res.json(updated);
});

export default router;
