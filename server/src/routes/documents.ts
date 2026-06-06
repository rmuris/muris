import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import prisma from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel', 'text/csv'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const DOC_TYPES = ['PEDIMENTO','US_CUSTOMS_ENTRY','COMMERCIAL_INVOICE','BOL','PACKING_LIST','CERTIFICATE_OF_ORIGIN','OTHER'] as const;

router.get('/', async (req: AuthRequest, res) => {
  const { shipmentId, orderId, companyId, type } = req.query;
  const isPortal = req.user!.role === 'PORTAL_USER';

  const docs = await prisma.document.findMany({
    where: {
      ...(shipmentId ? { shipmentId: String(shipmentId) } : {}),
      ...(orderId ? { orderId: String(orderId) } : {}),
      ...(type ? { type: String(type) } : {}),
      ...(isPortal
        ? { OR: [{ isPublic: true }, { companyId: req.user!.companyId ?? undefined }] }
        : companyId ? { companyId: String(companyId) } : {}),
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
      company: { select: { id: true, name: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(docs);
});

router.post('/upload', upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const schema = z.object({
    type: z.enum(DOC_TYPES),
    shipmentId: z.string().optional(),
    orderId: z.string().optional(),
    companyId: z.string().optional(),
    description: z.string().optional(),
    isPublic: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const doc = await prisma.document.create({
    data: {
      type: parsed.data.type,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      shipmentId: parsed.data.shipmentId,
      orderId: parsed.data.orderId,
      companyId: parsed.data.companyId ?? req.user!.companyId ?? undefined,
      uploadedById: req.user!.id,
      description: parsed.data.description,
      isPublic: parsed.data.isPublic === 'true',
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });
  res.status(201).json(doc);
});

router.get('/:id/download', async (req: AuthRequest, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const isPortal = req.user!.role === 'PORTAL_USER';
  if (isPortal && !doc.isPublic && doc.companyId !== req.user!.companyId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!fs.existsSync(doc.path)) return res.status(404).json({ error: 'File not found on disk' });
  res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
  res.setHeader('Content-Type', doc.mimeType);
  res.sendFile(doc.path);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.uploadedById !== req.user!.id && !['SUPER_ADMIN','ADMIN'].includes(req.user!.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (fs.existsSync(doc.path)) fs.unlinkSync(doc.path);
  await prisma.document.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
