import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const InvoiceSchema = z.object({
  customerId: z.string().optional(),
  orderId: z.string().optional(),
  type: z.string().default('RECEIVABLE'),
  status: z.string().default('DRAFT'),
  dueDate: z.string().optional(),
  subtotal: z.number().default(0),
  tax: z.number().default(0),
  total: z.number().default(0),
  paidAmount: z.number().default(0),
  balance: z.number().default(0),
  currency: z.string().default('USD'),
  exchangeRate: z.number().optional(),
  notes: z.string().optional(),
  items: z.any().optional(),
});

const PaymentSchema = z.object({
  amount: z.number(),
  method: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

function generateInvoiceNo() {
  return `INV-${Date.now()}`;
}

router.get('/', async (req, res) => {
  const { type } = req.query;
  const invoices = await prisma.invoice.findMany({
    where: type ? { type: type as string } : undefined,
    include: { customer: true, payments: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(invoices);
});

router.get('/summary', async (req, res) => {
  const receivables = await prisma.invoice.aggregate({
    where: { type: 'RECEIVABLE', status: { not: 'PAID' } },
    _sum: { balance: true },
  });
  const payables = await prisma.invoice.aggregate({
    where: { type: 'PAYABLE', status: { not: 'PAID' } },
    _sum: { balance: true },
  });
  const overdue = await prisma.invoice.count({
    where: { status: 'OVERDUE' },
  });
  const totalRevenue = await prisma.invoice.aggregate({
    where: { type: 'RECEIVABLE', status: 'PAID' },
    _sum: { total: true },
  });
  res.json({
    totalAR: receivables._sum.balance ?? 0,
    totalAP: payables._sum.balance ?? 0,
    overdueCount: overdue,
    totalRevenue: totalRevenue._sum.total ?? 0,
  });
});

router.post('/', async (req, res) => {
  const data = InvoiceSchema.parse(req.body);
  const total = data.subtotal + data.tax;
  const invoice = await prisma.invoice.create({
    data: {
      ...data,
      invoiceNo: generateInvoiceNo(),
      total,
      balance: total - (data.paidAmount ?? 0),
      items: data.items ? JSON.stringify(data.items) : '[]',
    },
  });
  res.status(201).json(invoice);
});

router.put('/:id', async (req, res) => {
  const data = InvoiceSchema.partial().parse(req.body);
  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      ...data,
      items: data.items ? JSON.stringify(data.items) : undefined,
    },
  });
  res.json(invoice);
});

router.post('/:id/payment', async (req, res) => {
  const data = PaymentSchema.parse(req.body);
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return res.status(404).json({ error: 'Not found' });

  const payment = await prisma.payment.create({
    data: { ...data, invoiceId: req.params.id },
  });

  const newPaidAmount = invoice.paidAmount + data.amount;
  const newBalance = invoice.total - newPaidAmount;
  const newStatus = newBalance <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : invoice.status;

  await prisma.invoice.update({
    where: { id: req.params.id },
    data: { paidAmount: newPaidAmount, balance: Math.max(0, newBalance), status: newStatus },
  });

  res.status(201).json(payment);
});

export default router;
