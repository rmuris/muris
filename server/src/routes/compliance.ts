import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const ComplianceSchema = z.object({
  type: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  status: z.string().default('ACTIVE'),
  score: z.number().default(0),
  lastAuditDate: z.string().optional(),
  nextAuditDate: z.string().optional(),
  certificationNo: z.string().optional(),
  expiresAt: z.string().optional(),
  findings: z.any().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req, res) => {
  const records = await prisma.complianceRecord.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(records);
});

router.post('/', async (req, res) => {
  const data = ComplianceSchema.parse(req.body);
  const record = await prisma.complianceRecord.create({
    data: {
      ...data,
      findings: data.findings ? JSON.stringify(data.findings) : undefined,
    },
  });
  res.status(201).json(record);
});

router.get('/score', async (req, res) => {
  const records = await prisma.complianceRecord.findMany({ where: { status: 'ACTIVE' } });
  const ctpatRecords = records.filter(r => r.type === 'CTPAT');
  const oeaRecords = records.filter(r => r.type === 'OEA');
  const ctpatScore =
    ctpatRecords.reduce((a, b) => a + b.score, 0) / Math.max(1, ctpatRecords.length);
  const oeaScore = oeaRecords.reduce((a, b) => a + b.score, 0) / Math.max(1, oeaRecords.length);
  const overallScore = records.reduce((a, b) => a + b.score, 0) / Math.max(1, records.length);
  res.json({
    ctpatScore: Math.round(ctpatScore),
    oeaScore: Math.round(oeaScore),
    overallScore: Math.round(overallScore),
    totalRecords: records.length,
  });
});

export default router;
