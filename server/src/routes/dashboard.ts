import { Router } from 'express';
import prisma from '../db';

const router = Router();

router.get('/', async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    pendingOrders,
    activeShipments,
    deliveredToday,
    availableDrivers,
    availableVehicles,
    totalCarriers,
    totalCustomers,
    openRiskEvents,
    recentShipments,
    invoiceSummary,
    complianceScore,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.shipment.count({
      where: { status: { in: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
    }),
    prisma.shipment.count({ where: { status: 'DELIVERED', deliveredAt: { gte: today } } }),
    prisma.driver.count({ where: { status: 'AVAILABLE' } }),
    prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
    prisma.carrier.count({ where: { status: 'ACTIVE' } }),
    prisma.customer.count({ where: { status: 'ACTIVE' } }),
    prisma.riskEvent.count({ where: { status: 'OPEN' } }),
    prisma.shipment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { order: { include: { customer: true } }, driver: true, vehicle: true },
    }),
    prisma.invoice.aggregate({
      where: { type: 'RECEIVABLE' },
      _sum: { total: true, paidAmount: true, balance: true },
    }),
    prisma.complianceRecord.aggregate({
      where: { status: 'ACTIVE' },
      _avg: { score: true },
    }),
  ]);

  res.json({
    stats: {
      totalOrders,
      pendingOrders,
      activeShipments,
      deliveredToday,
      availableDrivers,
      availableVehicles,
      totalCarriers,
      totalCustomers,
      openRiskEvents,
      totalRevenue: invoiceSummary._sum.total ?? 0,
      totalAR: invoiceSummary._sum.balance ?? 0,
      totalCollected: invoiceSummary._sum.paidAmount ?? 0,
      complianceScore: Math.round(complianceScore._avg.score ?? 0),
    },
    recentShipments,
  });
});

export default router;
