import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const WarehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string().default('MX'),
  zipCode: z.string().optional(),
  type: z.string().default('GENERAL'),
  sqft: z.number().optional(),
  capacity: z.number().optional(),
});

const InventorySchema = z.object({
  warehouseId: z.string(),
  locationId: z.string().optional(),
  sku: z.string().min(1),
  description: z.string(),
  quantity: z.number(),
  unitOfMeasure: z.string().default('UNIT'),
  weight: z.number().optional(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  expirationDate: z.string().optional(),
  customerId: z.string().optional(),
  hsCode: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  unitValue: z.number().optional(),
  totalValue: z.number().optional(),
});

router.get('/', async (req, res) => {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      _count: { select: { inventory: true, locations: true } },
    },
  });
  res.json(warehouses);
});

router.get('/:id', async (req, res) => {
  const w = await prisma.warehouse.findUnique({
    where: { id: req.params.id },
    include: { locations: true, inventory: true },
  });
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});

router.post('/', async (req, res) => {
  const data = WarehouseSchema.parse(req.body);
  const warehouse = await prisma.warehouse.create({ data });
  res.status(201).json(warehouse);
});

router.get('/inventory/all', async (req, res) => {
  const items = await prisma.inventoryItem.findMany({
    include: { warehouse: true, location: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});

router.post('/inventory', async (req, res) => {
  const data = InventorySchema.parse(req.body);
  const item = await prisma.inventoryItem.create({
    data: {
      ...data,
      totalValue: data.totalValue ?? (data.unitValue ? data.unitValue * data.quantity : undefined),
    },
  });
  res.status(201).json(item);
});

router.put('/inventory/:id', async (req, res) => {
  const data = InventorySchema.partial().parse(req.body);
  const item = await prisma.inventoryItem.update({ where: { id: req.params.id }, data });
  res.json(item);
});

router.delete('/inventory/:id', async (req, res) => {
  await prisma.inventoryItem.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
