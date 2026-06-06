import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const DriverSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  licenseNo: z.string().min(1),
  status: z.enum(['AVAILABLE', 'ON_ROUTE', 'OFF_DUTY']).optional(),
});

const VehicleSchema = z.object({
  plate: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int(),
  capacity: z.number().positive(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE']).optional(),
  mileage: z.number().int().optional(),
  lastService: z.string().datetime().optional(),
  driverId: z.string().optional().nullable(),
});

// Drivers
router.get('/drivers', async (_req, res) => {
  const drivers = await prisma.driver.findMany({
    include: { vehicle: true },
    orderBy: { name: 'asc' },
  });
  res.json(drivers);
});

router.post('/drivers', async (req, res) => {
  const parsed = DriverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const driver = await prisma.driver.create({ data: parsed.data });
  res.status(201).json(driver);
});

router.put('/drivers/:id', async (req, res) => {
  const parsed = DriverSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const driver = await prisma.driver.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { vehicle: true },
  });
  res.json(driver);
});

router.delete('/drivers/:id', async (req, res) => {
  await prisma.driver.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Vehicles
router.get('/vehicles', async (_req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    include: { driver: true },
    orderBy: { plate: 'asc' },
  });
  res.json(vehicles);
});

router.post('/vehicles', async (req, res) => {
  const parsed = VehicleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { lastService, ...rest } = parsed.data;
  const vehicle = await prisma.vehicle.create({
    data: { ...rest, ...(lastService ? { lastService: new Date(lastService) } : {}) },
    include: { driver: true },
  });
  res.status(201).json(vehicle);
});

router.put('/vehicles/:id', async (req, res) => {
  const parsed = VehicleSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { lastService, ...rest } = parsed.data;
  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data: { ...rest, ...(lastService ? { lastService: new Date(lastService) } : {}) },
    include: { driver: true },
  });
  res.json(vehicle);
});

router.delete('/vehicles/:id', async (req, res) => {
  await prisma.vehicle.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
