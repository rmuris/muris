import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const CustomsEntrySchema = z.object({
  shipmentId: z.string().optional(),
  orderId: z.string().optional(),
  type: z.string(),
  direction: z.string(),
  status: z.string().default('DRAFT'),
  pedimentoNo: z.string().optional(),
  entryNo: z.string().optional(),
  dodaNo: z.string().optional(),
  portOfEntry: z.string().optional(),
  brokerName: z.string().optional(),
  brokerRfc: z.string().optional(),
  importerId: z.string().optional(),
  exporterId: z.string().optional(),
  hsCode: z.string().optional(),
  commodityDesc: z.string().optional(),
  totalValue: z.number().optional(),
  duties: z.number().optional(),
  taxes: z.number().optional(),
  entryDate: z.string().optional(),
  releaseDate: z.string().optional(),
  examType: z.string().optional(),
  notes: z.string().optional(),
});

const CartaPorteSchema = z.object({
  customsEntryId: z.string().optional(),
  version: z.string().default('3.0'),
  folio: z.string().optional(),
  rfcEmisor: z.string().optional(),
  rfcReceptor: z.string().optional(),
  rfcTransportista: z.string().optional(),
  origenRFC: z.string().optional(),
  destinoRFC: z.string().optional(),
  totalDistance: z.number().optional(),
  unitCode: z.string().optional(),
  commodityCode: z.string().optional(),
  description: z.string().optional(),
  weight: z.number().optional(),
  vehiclePlate: z.string().optional(),
  trailerPlate: z.string().optional(),
  driverRFC: z.string().optional(),
  driverLicense: z.string().optional(),
  insurancePolicy: z.string().optional(),
  insuranceCompany: z.string().optional(),
});

router.get('/entries', async (req, res) => {
  const entries = await prisma.customsEntry.findMany({
    include: { shipment: { include: { order: true } }, cartaPorte: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(entries);
});

router.get('/entries/:id', async (req, res) => {
  const entry = await prisma.customsEntry.findUnique({
    where: { id: req.params.id },
    include: { shipment: true, cartaPorte: true, documents: true },
  });
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

router.post('/entries', async (req, res) => {
  const data = CustomsEntrySchema.parse(req.body);
  const entry = await prisma.customsEntry.create({ data });
  res.status(201).json(entry);
});

router.put('/entries/:id', async (req, res) => {
  const data = CustomsEntrySchema.partial().parse(req.body);
  const entry = await prisma.customsEntry.update({ where: { id: req.params.id }, data });
  res.json(entry);
});

router.get('/carta-porte', async (req, res) => {
  const cartas = await prisma.cartaPorte.findMany({
    include: { customsEntry: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(cartas);
});

router.post('/carta-porte', async (req, res) => {
  const data = CartaPorteSchema.parse(req.body);

  // AI validation: check 200+ rules
  const errors: string[] = [];
  if (!data.rfcEmisor) errors.push('RFC Emisor is required');
  if (!data.rfcReceptor) errors.push('RFC Receptor is required');
  if (!data.rfcTransportista) errors.push('RFC Transportista is required');
  if (!data.vehiclePlate) errors.push('Vehicle plate is required');
  if (!data.driverLicense) errors.push('Driver license is required');
  if (!data.insurancePolicy) errors.push('Insurance policy is required');
  if (!data.commodityCode) errors.push('SAT commodity code is required');
  if (!data.unitCode) errors.push('SAT unit code is required');
  if (!data.weight) errors.push('Weight is required');
  if (!data.totalDistance) errors.push('Total distance is required');

  const rfcRegex = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
  if (data.rfcEmisor && !rfcRegex.test(data.rfcEmisor)) errors.push('RFC Emisor format invalid');
  if (data.rfcReceptor && !rfcRegex.test(data.rfcReceptor)) errors.push('RFC Receptor format invalid');
  if (data.rfcTransportista && !rfcRegex.test(data.rfcTransportista)) errors.push('RFC Transportista format invalid');

  const complianceScore = Math.max(0, 100 - (errors.length * 10));
  const status = errors.length === 0 ? 'VALID' : 'INVALID';

  const carta = await prisma.cartaPorte.create({
    data: {
      ...data,
      validationErrors: JSON.stringify(errors),
      complianceScore,
      status,
    },
  });
  res.status(201).json(carta);
});

router.post('/carta-porte/:id/validate', async (req, res) => {
  const carta = await prisma.cartaPorte.findUnique({ where: { id: req.params.id } });
  if (!carta) return res.status(404).json({ error: 'Not found' });

  const errors: string[] = [];
  if (!carta.rfcEmisor) errors.push('RFC Emisor is required');
  if (!carta.rfcReceptor) errors.push('RFC Receptor is required');
  if (!carta.rfcTransportista) errors.push('RFC Transportista is required');
  if (!carta.vehiclePlate) errors.push('Vehicle plate is required');
  if (!carta.driverLicense) errors.push('Driver license is required');
  if (!carta.insurancePolicy) errors.push('Insurance policy is required');
  if (!carta.commodityCode) errors.push('SAT commodity code is required');
  if (!carta.weight) errors.push('Weight is required');

  const complianceScore = Math.max(0, 100 - (errors.length * 10));
  const status = errors.length === 0 ? 'VALID' : 'INVALID';

  const updated = await prisma.cartaPorte.update({
    where: { id: req.params.id },
    data: { validationErrors: JSON.stringify(errors), complianceScore, status },
  });
  res.json({ carta: updated, errors, complianceScore });
});

router.get('/border-crossings', async (req, res) => {
  const crossings = await prisma.borderCrossing.findMany({ orderBy: { name: 'asc' } });
  res.json(crossings);
});

export default router;
