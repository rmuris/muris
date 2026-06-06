import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const CustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

router.get('/', async (_req, res) => {
  const customers = await prisma.customer.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(customers);
});

router.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { orders: { orderBy: { createdAt: 'desc' } } },
  });
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json(customer);
});

router.post('/', async (req, res) => {
  const parsed = CustomerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const customer = await prisma.customer.create({ data: parsed.data });
  res.status(201).json(customer);
});

router.put('/:id', async (req, res) => {
  const parsed = CustomerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(customer);
});

router.delete('/:id', async (req, res) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
