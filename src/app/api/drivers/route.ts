import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET() {
  try {
    const drivers = await prisma.driver.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(drivers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser(['DISPATCHER', 'ADMIN']);
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const name = typeof data.name === 'string' ? data.name.trim().slice(0, 100) : '';
    const phone = typeof data.phone === 'string' ? data.phone.replace(/\D/g, '') : '';
    const licenseNumber = typeof data.licenseNumber === 'string' ? data.licenseNumber.trim().slice(0, 50) : null;
    if (name.length < 2 || !/^(?:0\d{9}|84\d{9})$/.test(phone)) return NextResponse.json({ error: 'Tên hoặc số điện thoại không hợp lệ' }, { status: 400 });
    const driver = await prisma.driver.create({
      data: { name, phone, licenseNumber }
    });
    return NextResponse.json(driver, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'Số điện thoại tài xế đã tồn tại' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}
