import { Router } from 'express';
import prisma from '../db';

const router = Router();

router.get('/revenue', async (req, res) => {
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: last30 }, status: { not: 'CANCELLED' } },
    select: { totalCost: true, createdAt: true, status: true },
  });

  const dailyRevenue: Record<string, number> = {};
  orders.forEach(o => {
    const date = o.createdAt.toISOString().split('T')[0];
    dailyRevenue[date] = (dailyRevenue[date] ?? 0) + (o.totalCost ?? 0);
  });

  res.json({ dailyRevenue, totalOrders: orders.length });
});

router.get('/lanes', async (req, res) => {
  const shipments = await prisma.shipment.findMany({
    select: { origin: true, destination: true, status: true },
    take: 500,
  });

  const laneMap: Record<string, { count: number; origin: string; destination: string }> = {};
  shipments.forEach(s => {
    const key = `${s.origin}→${s.destination}`;
    if (!laneMap[key]) laneMap[key] = { count: 0, origin: s.origin, destination: s.destination };
    laneMap[key].count++;
  });

  const lanes = Object.values(laneMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  res.json(lanes);
});

router.get('/kpi', async (req, res) => {
  const [
    totalOrders,
    activeShipments,
    totalCustomers,
    totalCarriers,
    availableDrivers,
    availableVehicles,
    openInvoices,
    riskEvents,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.shipment.count({
      where: { status: { in: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
    }),
    prisma.customer.count(),
    prisma.carrier.count(),
    prisma.driver.count({ where: { status: 'AVAILABLE' } }),
    prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
    prisma.invoice.count({ where: { status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } } }),
    prisma.riskEvent.count({ where: { status: 'OPEN' } }),
  ]);

  const revenue = await prisma.invoice.aggregate({
    where: { type: 'RECEIVABLE' },
    _sum: { total: true, paidAmount: true },
  });

  res.json({
    totalOrders,
    activeShipments,
    totalCustomers,
    totalCarriers,
    availableDrivers,
    availableVehicles,
    openInvoices,
    openRiskEvents: riskEvents,
    totalRevenue: revenue._sum.total ?? 0,
    totalCollected: revenue._sum.paidAmount ?? 0,
  });
});

export default router;
