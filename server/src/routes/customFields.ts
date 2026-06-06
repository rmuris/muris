import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const defSchema = z.object({
  entityType: z.enum(['ORDER', 'SHIPMENT', 'CUSTOMER', 'COMPANY']),
  name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'name must be alphanumeric + underscore'),
  label: z.string().min(1),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN']),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  position: z.number().int().optional(),
});

// GET /api/custom-fields?entityType=ORDER
router.get('/', async (req, res) => {
  const { entityType } = req.query;
  const where: any = { isActive: true };
  if (entityType) where.entityType = entityType;
  const defs = await prisma.customFieldDef.findMany({ where, orderBy: [{ entityType: 'asc' }, { position: 'asc' }] });
  res.json(defs);
});

// POST /api/custom-fields  (admin/manager only)
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  const data = defSchema.parse(req.body);
  const def = await prisma.customFieldDef.create({
    data: {
      ...data,
      options: data.options ? JSON.stringify(data.options) : null,
      required: data.required ?? false,
      position: data.position ?? 0,
    },
  });
  res.json(def);
});

// PUT /api/custom-fields/:id
router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  const data = defSchema.partial().parse(req.body);
  const def = await prisma.customFieldDef.update({
    where: { id: req.params.id },
    data: {
      ...data,
      options: data.options !== undefined ? JSON.stringify(data.options) : undefined,
    },
  });
  res.json(def);
});

// DELETE /api/custom-fields/:id  (soft delete)
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  await prisma.customFieldDef.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ ok: true });
});

// PUT /api/custom-fields/values/:entityType/:entityId  — save custom field values
router.put('/values/:entityType/:entityId', async (req, res) => {
  const { entityType, entityId } = req.params;
  const values: Record<string, unknown> = req.body;

  const jsonStr = JSON.stringify(values);

  if (entityType === 'ORDER') {
    await prisma.order.update({ where: { id: entityId }, data: { customData: jsonStr } });
  } else if (entityType === 'SHIPMENT') {
    await prisma.shipment.update({ where: { id: entityId }, data: { customData: jsonStr } });
  } else if (entityType === 'CUSTOMER') {
    await prisma.customer.update({ where: { id: entityId }, data: { customData: jsonStr } });
  } else if (entityType === 'COMPANY') {
    await prisma.company.update({ where: { id: entityId }, data: { customData: jsonStr } });
  } else {
    return res.status(400).json({ error: 'Unknown entityType' });
  }
  res.json({ ok: true });
});

export default router;
