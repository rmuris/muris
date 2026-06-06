import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const RESOURCES = ['DASHBOARD','ORDERS','SHIPMENTS','FLEET','CUSTOMERS','COMPANIES','USERS','TASKS','DOCUMENTS','UPDATES'];

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN','ADMIN','STAFF','MANAGER','PORTAL_USER','VIEWER']),
  companyId: z.string().optional().nullable(),
});

const PermissionsSchema = z.record(
  z.enum(['DASHBOARD','ORDERS','SHIPMENTS','FLEET','CUSTOMERS','COMPANIES','USERS','TASKS','DOCUMENTS','UPDATES']),
  z.object({
    canCreate: z.boolean(),
    canRead: z.boolean(),
    canUpdate: z.boolean(),
    canDelete: z.boolean(),
  })
);

// Default permissions by role
function defaultPermissions(role: string) {
  const all = { canCreate: true, canRead: true, canUpdate: true, canDelete: true };
  const readOnly = { canCreate: false, canRead: true, canUpdate: false, canDelete: false };
  const standard = { canCreate: true, canRead: true, canUpdate: true, canDelete: false };

  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return RESOURCES.map(r => ({ resource: r, ...all }));
    case 'MANAGER':
      return RESOURCES.map(r => ({ resource: r, ...standard }));
    case 'STAFF':
      return RESOURCES.map(r => ({
        resource: r,
        ...(['USERS','COMPANIES'].includes(r) ? readOnly : standard),
      }));
    case 'PORTAL_USER':
      return RESOURCES.map(r => ({
        resource: r,
        ...(['ORDERS','SHIPMENTS','TASKS','DOCUMENTS','UPDATES'].includes(r)
          ? { canCreate: false, canRead: true, canUpdate: false, canDelete: false }
          : { canCreate: false, canRead: false, canUpdate: false, canDelete: false }),
      }));
    default: // VIEWER
      return RESOURCES.map(r => ({ resource: r, ...readOnly }));
  }
}

router.get('/', requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { company: { select: { id: true, name: true, type: true } }, permissions: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users.map(({ passwordHash, ...u }) => u));
});

router.get('/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { company: true, permissions: true },
  });
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const parsed = UserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const hash = await bcrypt.hash(parsed.data.password, 12);
  const perms = defaultPermissions(parsed.data.role);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: hash,
      role: parsed.data.role,
      companyId: parsed.data.companyId ?? null,
      permissions: { create: perms },
    },
    include: { permissions: true, company: true },
  });
  const { passwordHash, ...safe } = user;
  res.status(201).json(safe);
});

router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const schema = UserSchema.omit({ password: true }).partial().extend({
    password: z.string().min(8).optional(),
    isActive: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data: any = { ...parsed.data };
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 12);
    delete data.password;
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    include: { permissions: true, company: true },
  });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

router.put('/:id/permissions', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const parsed = PermissionsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // Upsert each permission
  await Promise.all(
    Object.entries(parsed.data).map(([resource, perms]) =>
      prisma.userPermission.upsert({
        where: { userId_resource: { userId: req.params.id, resource } },
        create: { userId: req.params.id, resource, ...perms },
        update: perms,
      })
    )
  );

  const permissions = await prisma.userPermission.findMany({ where: { userId: req.params.id } });
  res.json(permissions);
});

router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthRequest, res) => {
  if (req.params.id === req.user!.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
