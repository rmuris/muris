import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const UpdateSchema = z.object({
  shipmentId: z.string().optional(),
  orderId: z.string().optional(),
  type: z.enum(['NOTE','STATUS_CHANGE','DOCUMENT_UPLOAD','TASK_UPDATE','CUSTOMS_UPDATE','CARRIER_UPDATE','EXCEPTION','CHECKPOINT']),
  content: z.string().min(1),
  visibility: z.enum(['INTERNAL','ALL','CUSTOMER','CARRIER','CUSTOMS_BROKER']).default('INTERNAL'),
  metadata: z.any().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const { shipmentId, orderId, visibility } = req.query;
  const isPortal = req.user!.role === 'PORTAL_USER';

  const updates = await prisma.operationUpdate.findMany({
    where: {
      ...(shipmentId ? { shipmentId: String(shipmentId) } : {}),
      ...(orderId ? { orderId: String(orderId) } : {}),
      // Portal users only see updates not marked INTERNAL
      ...(isPortal ? { visibility: { not: 'INTERNAL' } } : {}),
      ...(visibility ? { visibility: String(visibility) } : {}),
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
      company: { select: { id: true, name: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(updates);
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const update = await prisma.operationUpdate.create({
    data: {
      ...parsed.data,
      metadata: parsed.data.metadata ? JSON.stringify(parsed.data.metadata) : undefined,
      authorId: req.user!.id,
      companyId: req.user!.companyId,
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
      company: { select: { id: true, name: true, type: true } },
    },
  });
  res.status(201).json(update);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const update = await prisma.operationUpdate.findUnique({ where: { id: req.params.id } });
  if (!update) return res.status(404).json({ error: 'Not found' });
  if (update.authorId !== req.user!.id && !['SUPER_ADMIN','ADMIN'].includes(req.user!.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await prisma.operationUpdate.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
