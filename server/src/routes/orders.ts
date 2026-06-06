import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const OrderSchema = z.object({
  customerId: z.string(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  weight: z.number().positive(),
  description: z.string().optional(),
  totalCost: z.number().optional(),
});

function generateOrderNo() {
  return `ORD-${Date.now().toString(36).toUpperCase()}`;
}

router.get('/', async (req, res) => {
  const { status, customerId } = req.query;
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: String(status) } : {}),
      ...(customerId ? { customerId: String(customerId) } : {}),
    },
    include: { customer: true, shipment: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

router.get('/:id', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { customer: true, shipment: { include: { driver: true, vehicle: true, events: { orderBy: { createdAt: 'asc' } } } } },
  });
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

router.post('/', async (req, res) => {
  const parsed = OrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const order = await prisma.order.create({
    data: { ...parsed.data, orderNo: generateOrderNo() },
    include: { customer: true },
  });
  res.status(201).json(order);
});

router.put('/:id', async (req, res) => {
  const parsed = OrderSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { customer: true },
  });
  res.json(order);
});

router.delete('/:id', async (req, res) => {
  await prisma.order.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
