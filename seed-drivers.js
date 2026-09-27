const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const drivers = [
    { name: 'Nguyễn Văn Hùng', phone: '0901234567', licenseNumber: 'B2-12345' },
    { name: 'Trần Bình Trọng', phone: '0987654321', licenseNumber: 'D-98765' },
    { name: 'Lê Tấn Phát', phone: '0912345678', licenseNumber: 'E-56789' },
  ];

  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { phone: d.phone },
      update: {},
      create: d,
    });
  }
  console.log('Drivers seeded');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
