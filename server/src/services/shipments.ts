import prisma from '../db';

/**
 * Shipment lifecycle logic shared by the REST routes and the AI tool layer.
 * Both callers must produce identical side effects, so the transactions live
 * here rather than being duplicated per caller.
 */

export type ShipmentStatus =
  | 'PENDING'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED';

export function generateTrackingNo() {
  return `TRK-${Date.now().toString(36).toUpperCase()}`;
}

// Rough distance estimate. In a real TMS, call a routing API.
export function estimateRoute(_origin: string, _destination: string) {
  return {
    estimatedDist: Math.round(50 + Math.random() * 450),
    estimatedTime: Math.round(60 + Math.random() * 480),
  };
}

export class ShipmentError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Atomically links order + driver + vehicle, marking both resources busy. */
export async function assignShipment(input: {
  orderId: string;
  driverId: string;
  vehicleId: string;
  notes?: string;
}) {
  const { orderId, driverId, vehicleId, notes } = input;

  const [order, driver, vehicle] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.driver.findUnique({ where: { id: driverId } }),
    prisma.vehicle.findUnique({ where: { id: vehicleId } }),
  ]);

  if (!order) throw new ShipmentError('Order not found', 404);
  if (!driver) throw new ShipmentError('Driver not found', 404);
  if (!vehicle) throw new ShipmentError('Vehicle not found', 404);

  const { estimatedDist, estimatedTime } = estimateRoute(order.origin, order.destination);

  const [shipment] = await prisma.$transaction([
    prisma.shipment.create({
      data: {
        trackingNo: generateTrackingNo(),
        orderId,
        driverId,
        vehicleId,
        origin: order.origin,
        destination: order.destination,
        estimatedDist,
        estimatedTime,
        notes,
        status: 'PENDING',
      },
      include: { order: { include: { customer: true } }, driver: true, vehicle: true },
    }),
    prisma.order.update({ where: { id: orderId }, data: { status: 'ASSIGNED' } }),
    prisma.driver.update({ where: { id: driverId }, data: { status: 'ON_ROUTE' } }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'IN_USE' } }),
  ]);

  return shipment;
}

/**
 * Advances a shipment and appends a ShipmentEvent. Delivering also frees the
 * driver and vehicle and closes out the order.
 */
export async function setShipmentStatus(
  shipmentId: string,
  input: { status: ShipmentStatus; note?: string; location?: string },
) {
  const { status, note, location } = input;

  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw new ShipmentError('Shipment not found', 404);

  const now = new Date();
  const updates: Record<string, unknown> = { status };
  if (status === 'PICKED_UP') updates.pickedUpAt = now;
  if (status === 'DELIVERED') {
    updates.deliveredAt = now;
    // Free driver and vehicle
    if (shipment.driverId)
      await prisma.driver.update({ where: { id: shipment.driverId }, data: { status: 'AVAILABLE' } });
    if (shipment.vehicleId)
      await prisma.vehicle.update({ where: { id: shipment.vehicleId }, data: { status: 'AVAILABLE' } });
    await prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'DELIVERED' } });
  }

  const [updated] = await prisma.$transaction([
    prisma.shipment.update({
      where: { id: shipmentId },
      data: updates,
      include: { events: { orderBy: { createdAt: 'asc' } } },
    }),
    prisma.shipmentEvent.create({ data: { shipmentId, status, note, location } }),
  ]);

  return updated;
}
