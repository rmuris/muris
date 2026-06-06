import { Router } from 'express';
import prisma from '../db';

const router = Router();

router.get('/', async (_req, res) => {
  const [
    totalOrders,
    pendingOrders,
    activeShipments,
    deliveredToday,
    availableDrivers,
    availableVehicles,
    recentShipments,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.shipment.count({ where: { status: { in: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } } }),
    prisma.shipment.count({
      where: {
        status: 'DELIVERED',
        deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.driver.count({ where: { status: 'AVAILABLE' } }),
    prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
    prisma.shipment.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { order: { include: { customer: true } }, driver: true },
    }),
  ]);

  res.json({
    stats: { totalOrders, pendingOrders, activeShipments, deliveredToday, availableDrivers, availableVehicles },
    recentShipments,
  });
});

export default router;
