import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToCompanyId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  shipmentId: z.string().optional(),
  orderId: z.string().optional(),
  priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).default('MEDIUM'),
  dueDate: z.string().optional(),
  checklistItems: z.array(z.object({ text: z.string().min(1), position: z.number().default(0) })).optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const { shipmentId, orderId, companyId, status } = req.query;
  const isPortal = req.user!.role === 'PORTAL_USER';

  const tasks = await prisma.task.findMany({
    where: {
      ...(shipmentId ? { shipmentId: String(shipmentId) } : {}),
      ...(orderId ? { orderId: String(orderId) } : {}),
      ...(status ? { status: String(status) } : {}),
      // Portal users see only tasks assigned to their company
      ...(isPortal && req.user!.companyId
        ? { assignedToCompanyId: req.user!.companyId }
        : companyId ? { assignedToCompanyId: String(companyId) } : {}),
    },
    include: {
      checklistItems: { orderBy: { position: 'asc' } },
      assignedToCompany: { select: { id: true, name: true, type: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tasks);
});

router.get('/:id', async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      checklistItems: { orderBy: { position: 'asc' } },
      assignedToCompany: true,
      assignedToUser: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      shipment: { select: { id: true, trackingNo: true, status: true } },
      order: { select: { id: true, orderNo: true, status: true } },
    },
  });
  if (!task) return res.status(404).json({ error: 'Not found' });
  res.json(task);
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = TaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { checklistItems, dueDate, ...rest } = parsed.data;
  const task = await prisma.task.create({
    data: {
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdByUserId: req.user!.id,
      checklistItems: checklistItems?.length
        ? { create: checklistItems }
        : undefined,
    },
    include: { checklistItems: { orderBy: { position: 'asc' } }, assignedToCompany: true, createdBy: { select: { id: true, name: true } } },
  });
  res.status(201).json(task);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const schema = TaskSchema.omit({ checklistItems: true }).partial().extend({
    status: z.enum(['PENDING','IN_PROGRESS','COMPLETED','CANCELLED']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data: any = { ...parsed.data };
  if (data.dueDate) data.dueDate = new Date(data.dueDate);
  if (parsed.data.status === 'COMPLETED') data.completedAt = new Date();

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data,
    include: { checklistItems: { orderBy: { position: 'asc' } }, assignedToCompany: true },
  });
  res.json(task);
});

// Toggle checklist item
router.put('/:id/checklist/:itemId', async (req: AuthRequest, res) => {
  const { isCompleted } = req.body;
  const item = await prisma.taskChecklistItem.update({
    where: { id: req.params.itemId },
    data: {
      isCompleted: Boolean(isCompleted),
      completedAt: isCompleted ? new Date() : null,
      completedById: isCompleted ? req.user!.id : null,
    },
  });
  res.json(item);
});

// Add checklist item
router.post('/:id/checklist', async (req, res) => {
  const { text, position } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const item = await prisma.taskChecklistItem.create({
    data: { taskId: req.params.id, text, position: position ?? 0 },
  });
  res.status(201).json(item);
});

// Delete checklist item
router.delete('/:id/checklist/:itemId', async (req, res) => {
  await prisma.taskChecklistItem.delete({ where: { id: req.params.itemId } });
  res.status(204).send();
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'Not found' });
  if (task.createdByUserId !== req.user!.id && !['SUPER_ADMIN','ADMIN'].includes(req.user!.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await prisma.task.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
