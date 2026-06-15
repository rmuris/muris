import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const QuoteSchema = z.object({
  customerId: z.string().optional(),
  origin: z.string(),
  destination: z.string(),
  weight: z.number().optional(),
  commodity: z.string().optional(),
  equipmentType: z.string().optional(),
  pickupDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  rate: z.number().optional(),
  fuelSurcharge: z.number().optional(),
  accessorials: z.number().optional(),
  totalRate: z.number().optional(),
  costBasis: z.number().optional(),
  margin: z.number().optional(),
  marginPct: z.number().optional(),
  status: z.string().default('DRAFT'),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

function generateQuoteNo() {
  return `QT-${Date.now()}`;
}

function aiGenerateRate(data: { weight?: number; equipmentType?: string }) {
  const base = 1500;
  const weightFactor = data.weight ? data.weight * 5 : 0;
  const equipFactor = data.equipmentType === 'REEFER' ? 300 : 0;
  const rate = base + weightFactor + equipFactor + Math.random() * 200;
  const fuel = rate * 0.15;
  const totalRate = rate + fuel;
  const costBasis = totalRate * 0.75;
  const margin = totalRate - costBasis;
  const marginPct = (margin / totalRate) * 100;
  return {
    rate: Math.round(rate),
    fuelSurcharge: Math.round(fuel),
    totalRate: Math.round(totalRate),
    costBasis: Math.round(costBasis),
    margin: Math.round(margin),
    marginPct: Math.round(marginPct * 10) / 10,
  };
}

router.get('/', async (req, res) => {
  const quotes = await prisma.quote.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(quotes);
});

router.post('/', async (req, res) => {
  const data = QuoteSchema.parse(req.body);
  const aiRate = aiGenerateRate(data);
  const quote = await prisma.quote.create({
    data: {
      ...data,
      quoteNo: generateQuoteNo(),
      ...aiRate,
      aiGenerated: true,
      validUntil: data.validUntil ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  res.status(201).json(quote);
});

router.put('/:id', async (req, res) => {
  const data = QuoteSchema.partial().parse(req.body);
  const quote = await prisma.quote.update({ where: { id: req.params.id }, data });
  res.json(quote);
});

router.delete('/:id', async (req, res) => {
  await prisma.quote.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
