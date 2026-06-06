import prisma from './db';

async function main() {
  const customer1 = await prisma.customer.create({
    data: { name: 'Acme Corp', email: 'logistics@acme.com', phone: '555-0101', address: '100 Main St, New York, NY' },
  });
  const customer2 = await prisma.customer.create({
    data: { name: 'Global Trade Ltd', email: 'ops@globaltrade.com', phone: '555-0202', address: '200 Harbor Blvd, Los Angeles, CA' },
  });

  const driver1 = await prisma.driver.create({
    data: { name: 'Carlos Rivera', email: 'c.rivera@fleet.com', phone: '555-0301', licenseNo: 'CDL-001', status: 'AVAILABLE' },
  });
  const driver2 = await prisma.driver.create({
    data: { name: 'Maria Santos', email: 'm.santos@fleet.com', phone: '555-0302', licenseNo: 'CDL-002', status: 'AVAILABLE' },
  });

  await prisma.vehicle.createMany({
    data: [
      { plate: 'TX-1001', make: 'Freightliner', model: 'Cascadia', year: 2021, capacity: 20, driverId: driver1.id },
      { plate: 'TX-1002', make: 'Kenworth', model: 'T680', year: 2020, capacity: 25, driverId: driver2.id },
      { plate: 'TX-1003', make: 'Peterbilt', model: '579', year: 2022, capacity: 22, status: 'MAINTENANCE' },
    ],
  });

  await prisma.order.createMany({
    data: [
      { orderNo: 'ORD-SEED01', customerId: customer1.id, origin: 'New York, NY', destination: 'Chicago, IL', weight: 8, description: 'Electronics', status: 'PENDING', totalCost: 1200 },
      { orderNo: 'ORD-SEED02', customerId: customer2.id, origin: 'Los Angeles, CA', destination: 'Phoenix, AZ', weight: 15, description: 'Auto Parts', status: 'PENDING', totalCost: 950 },
      { orderNo: 'ORD-SEED03', customerId: customer1.id, origin: 'Dallas, TX', destination: 'Houston, TX', weight: 5, description: 'Medical Supplies', status: 'DELIVERED', totalCost: 400 },
    ],
  });

  console.log('Seed complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
