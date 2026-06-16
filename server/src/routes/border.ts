import { Router } from 'express';
import prisma from '../db';

const router = Router();

router.get('/', async (req, res) => {
  const crossings = await prisma.borderCrossing.findMany({ orderBy: { name: 'asc' } });
  res.json(crossings);
});

router.get('/:id', async (req, res) => {
  const crossing = await prisma.borderCrossing.findUnique({ where: { id: req.params.id } });
  if (!crossing) return res.status(404).json({ error: 'Not found' });
  res.json(crossing);
});

export default router;
