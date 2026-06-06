import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';
import prisma from './db';

const RESOURCES = ['DASHBOARD','ORDERS','SHIPMENTS','FLEET','CUSTOMERS','COMPANIES','USERS','TASKS','DOCUMENTS','UPDATES'];

async function seedAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@muris.com' } });
  if (existing) return;

  const hash = await bcrypt.hash('Admin1234!', 12);
  await prisma.user.create({
    data: {
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
  console.log('✓ Admin user created: admin@muris.com / Admin1234!');
}

async function main() {
  console.log('Syncing database schema…');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  console.log('✓ Schema synced');

  await seedAdmin();
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
