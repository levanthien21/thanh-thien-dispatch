import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';

export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(vehicles);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser(['DISPATCHER', 'ADMIN']);
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const name = typeof data.name === 'string' ? data.name.trim().slice(0, 100) : '';
    const plateNumber = typeof data.plateNumber === 'string' ? data.plateNumber.trim().toUpperCase().slice(0, 20) : '';
    const type = typeof data.type === 'string' ? data.type.trim().slice(0, 50) : '';
    const seatCapacity = Number(data.seatCapacity);
    if (name.length < 2 || plateNumber.length < 5 || !type || !Number.isInteger(seatCapacity) || seatCapacity < 1 || seatCapacity > 60) return NextResponse.json({ error: 'Thông tin phương tiện không hợp lệ' }, { status: 400 });
    const vehicle = await prisma.vehicle.create({
      data: { name, plateNumber, type, seatCapacity }
    });
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'Biển số xe đã tồn tại' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
  }
}
