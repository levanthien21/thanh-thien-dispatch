const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.smsTemplate.upsert({
    where: { type: 'BOOKING_CONFIRMATION' },
    update: {},
    create: {
      type: 'BOOKING_CONFIRMATION',
      name: 'Xác nhận đặt vé thành công',
      content: 'Nha xe Thanh Thien xin chao {{name}}. Ma ve cua ban: {{booking_code}}. Tuyen: {{route}}. Don luc: {{time}} tai {{pickup}}. Vui long co mat truoc 15p. Hotline: 1900xxxx.',
      isActive: true,
    }
  });
  console.log("Seeded SMS template");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
