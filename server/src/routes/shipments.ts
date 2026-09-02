import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { assignShipment, setShipmentStatus, ShipmentError } from '../services/shipments';

const router = Router();

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

  try {
    const shipment = await assignShipment(parsed.data);
    res.status(201).json(shipment);
  } catch (err) {
    if (err instanceof ShipmentError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

// Update shipment status
router.post('/:id/status', async (req, res) => {
  const parsed = StatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const updated = await setShipmentStatus(req.params.id, parsed.data);
    res.json(updated);
  } catch (err) {
    if (err instanceof ShipmentError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

export default router;
