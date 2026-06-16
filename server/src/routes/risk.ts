import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const RiskEventSchema = z.object({
  customerId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  type: z.string(),
  severity: z.string(),
  title: z.string(),
  description: z.string().optional(),
});

router.get('/events', async (req, res) => {
  const events = await prisma.riskEvent.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(events);
});

router.post('/events', async (req, res) => {
  const data = RiskEventSchema.parse(req.body);
  const event = await prisma.riskEvent.create({ data });
  res.status(201).json(event);
});

router.put('/events/:id/resolve', async (req, res) => {
  const event = await prisma.riskEvent.update({
    where: { id: req.params.id },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
  res.json(event);
});

router.get('/score', async (req, res) => {
  const openEvents = await prisma.riskEvent.findMany({ where: { status: 'OPEN' } });
  const critical = openEvents.filter(e => e.severity === 'CRITICAL').length;
  const high = openEvents.filter(e => e.severity === 'HIGH').length;
  const medium = openEvents.filter(e => e.severity === 'MEDIUM').length;

  const expiredDocs = await prisma.document.count({
    where: { expiresAt: { lt: new Date() }, status: 'ACTIVE' },
  });

  const overdueinvoices = await prisma.invoice.count({ where: { status: 'OVERDUE' } });

  const riskScore = Math.min(
    100,
    critical * 20 + high * 10 + medium * 5 + expiredDocs * 3 + overdueinvoices * 2,
  );

  res.json({
    overallRiskScore: riskScore,
    openRiskEvents: openEvents.length,
    criticalEvents: critical,
    highEvents: high,
    mediumEvents: medium,
    expiredDocuments: expiredDocs,
    overdueInvoices: overdueinvoices,
    riskLevel:
      riskScore > 70
        ? 'CRITICAL'
        : riskScore > 40
          ? 'HIGH'
          : riskScore > 20
            ? 'MEDIUM'
            : 'LOW',
  });
});

export default router;
