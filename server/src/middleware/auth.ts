import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'muris-tms-secret-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    companyId: string | null;
    permissions: Array<{ resource: string; canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }>;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { permissions: true },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Unauthorized' });
    req.user = {
      id: user.id,
      role: user.role,
      companyId: user.companyId,
      permissions: user.permissions,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export function canAccess(resource: string, action: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { role } = req.user;
    // SUPER_ADMIN and ADMIN bypass permission checks
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return next();
    const perm = req.user.permissions.find(p => p.resource === resource);
    if (!perm || !perm[action]) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export { JWT_SECRET };
