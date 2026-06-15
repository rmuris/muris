import prisma from './db';

async function seedBorders() {
  const borders = [
    {
      name: 'Laredo / Nuevo Laredo',
      code: 'LRD',
      city: 'Laredo',
      country: 'US/MX',
      portType: 'land',
      waitTimeNB: 45,
      waitTimeSB: 25,
      isOpen: true,
    },
    {
      name: 'El Paso / Ciudad Juárez',
      code: 'ELP',
      city: 'El Paso',
      country: 'US/MX',
      portType: 'land',
      waitTimeNB: 35,
      waitTimeSB: 20,
      isOpen: true,
    },
    {
      name: 'Brownsville / Matamoros',
      code: 'BRO',
      city: 'Brownsville',
      country: 'US/MX',
      portType: 'land',
      waitTimeNB: 60,
      waitTimeSB: 30,
      isOpen: true,
    },
    {
      name: 'McAllen / Reynosa',
      code: 'MCA',
      city: 'McAllen',
      country: 'US/MX',
      portType: 'land',
      waitTimeNB: 50,
      waitTimeSB: 25,
      isOpen: true,
    },
    {
      name: 'Nogales / Nogales',
      code: 'NOG',
      city: 'Nogales',
      country: 'US/MX',
      portType: 'land',
      waitTimeNB: 30,
      waitTimeSB: 15,
      isOpen: true,
    },
    {
      name: 'San Diego / Tijuana',
      code: 'SDT',
      city: 'San Diego',
      country: 'US/MX',
      portType: 'land',
      waitTimeNB: 75,
      waitTimeSB: 40,
      isOpen: true,
    },
  ];

  for (const border of borders) {
    await prisma.borderCrossing.upsert({
      where: { code: border.code },
      update: border,
      create: border,
    });
  }
  console.log('Border crossings seeded');
}

seedBorders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
