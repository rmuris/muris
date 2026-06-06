import bcrypt from 'bcryptjs';
import prisma from './db';

const RESOURCES = ['DASHBOARD','ORDERS','SHIPMENTS','FLEET','CUSTOMERS','COMPANIES','USERS','TASKS','DOCUMENTS','UPDATES'];

async function main() {
  const hash = await bcrypt.hash('Admin1234!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@muris.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@muris.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      permissions: {
        create: RESOURCES.map(r => ({
          resource: r,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        })),
      },
    },
  });
  console.log('Admin user ready:', user.email, '/ Admin1234!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
