import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const CompanySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CUSTOMER','SUPPLIER','US_CARRIER','MX_CARRIER','US_CUSTOMS_BROKER','MX_CUSTOMS_BROKER']),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const { type } = req.query;
  const companies = await prisma.company.findMany({
    where: { ...(type ? { type: String(type) } : {}) },
    include: {
      _count: { select: { users: true, documents: true, tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(companies);
});

router.get('/:id', async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true } },
      documents: { orderBy: { createdAt: 'desc' }, take: 20 },
      tasks: { include: { checklistItems: true }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!company) return res.status(404).json({ error: 'Not found' });
  res.json(company);
});

router.post('/', requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = CompanySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const company = await prisma.company.create({ data: parsed.data });
  res.status(201).json(company);
});

router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = CompanySchema.partial().extend({
    onboardingStatus: z.enum(['PENDING','IN_PROGRESS','APPROVED','REJECTED']).optional(),
    onboardingData: z.string().optional(),
    isActive: z.boolean().optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const company = await prisma.company.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(company);
});

// Onboarding: portal users submit their company info
router.put('/:id/onboarding', authenticate, async (req: AuthRequest, res) => {
  // Portal user can only update their own company
  if (req.user!.role === 'PORTAL_USER' && req.user!.companyId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { onboardingData, onboardingStatus } = req.body;
  const data: any = {};
  if (onboardingData) data.onboardingData = JSON.stringify(onboardingData);
  if (onboardingStatus && ['SUPER_ADMIN','ADMIN','MANAGER'].includes(req.user!.role)) {
    data.onboardingStatus = onboardingStatus;
  } else if (onboardingData) {
    data.onboardingStatus = 'IN_PROGRESS';
  }
  const company = await prisma.company.update({ where: { id: req.params.id }, data });
  res.json(company);
});

router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  await prisma.company.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).send();
});

export default router;
