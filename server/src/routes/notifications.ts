import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const NotificationSchema = z.object({
  title: z.string(),
  message: z.string(),
  type: z.string().default('INFO'),
  channel: z.string().default('IN_APP'),
  recipientId: z.string().optional(),
  recipientEmail: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

router.get('/', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(notifications);
});

router.post('/', async (req, res) => {
  const data = NotificationSchema.parse(req.body);
  const n = await prisma.notification.create({ data });
  res.status(201).json(n);
});

router.put('/:id/read', async (req, res) => {
  const n = await prisma.notification.update({
    where: { id: req.params.id },
    data: { readAt: new Date(), status: 'READ' },
  });
  res.json(n);
});

export default router;
