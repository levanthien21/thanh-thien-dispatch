import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data just in case
  await prisma.schedule.deleteMany()
  await prisma.route.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()

  // 1. Vehicles
  const vehicle = await prisma.vehicle.create({
    data: {
      name: 'Xe 16 Chỗ VIP 1',
      plateNumber: '92B-123.45',
      type: 'Limousine',
      seatCapacity: 16,
    },
  })

  // 2. Routes
  const routeA = await prisma.route.create({
    data: {
      origin: 'Chu Lai',
      destination: 'Đà Nẵng',
    },
  })

  const routeB = await prisma.route.create({
    data: {
      origin: 'Đà Nẵng',
      destination: 'Chu Lai',
    },
  })

  // 3. Schedules (2 hour intervals: 05:00, 07:00, ..., 17:00)
  const times = ['05:00', '07:00', '09:00', '11:00', '13:00', '15:00', '17:00']
  
  for (const time of times) {
    await prisma.schedule.create({
      data: {
        routeId: routeA.id,
        departureTime: time,
      },
    })
    await prisma.schedule.create({
      data: {
        routeId: routeB.id,
        departureTime: time,
      },
    })
  }

  // 4. Create an Admin user
  await prisma.user.create({
    data: {
      name: 'Admin',
      phone: '0867757975',
      passwordHash: 'hashed_password', // Mock auth
      role: 'ADMIN',
    },
  })

  // 5. Create some sample customers
  await prisma.customer.create({
    data: {
      name: 'Nguyễn Văn A',
      phone: '0905123456',
    },
  })

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
