import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const CarrierSchema = z.object({
  name: z.string().min(1),
  mc: z.string().optional(),
  dot: z.string().optional(),
  ein: z.string().optional(),
  rfc: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().default('MX'),
  type: z.string().default('ASSET'),
  status: z.string().default('ACTIVE'),
  safetyScore: z.number().optional(),
  insuranceExpiry: z.string().optional(),
  insuranceAmount: z.number().optional(),
  riskScore: z.number().default(50),
  notes: z.string().optional(),
});

router.get('/', async (req, res) => {
  const carriers = await prisma.carrier.findMany({
    include: { _count: { select: { drivers: true, vehicles: true, shipments: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(carriers);
});

router.get('/:id', async (req, res) => {
  const carrier = await prisma.carrier.findUnique({
    where: { id: req.params.id },
    include: { drivers: true, vehicles: true, documents: true },
  });
  if (!carrier) return res.status(404).json({ error: 'Not found' });
  res.json(carrier);
});

router.post('/', async (req, res) => {
  const data = CarrierSchema.parse(req.body);
  const carrier = await prisma.carrier.create({ data });
  res.status(201).json(carrier);
});

router.put('/:id', async (req, res) => {
  const data = CarrierSchema.partial().parse(req.body);
  const carrier = await prisma.carrier.update({ where: { id: req.params.id }, data });
  res.json(carrier);
});

router.delete('/:id', async (req, res) => {
  await prisma.carrier.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
