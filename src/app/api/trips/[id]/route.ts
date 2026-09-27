import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        schedule: true,
        vehicle: true,
        route: true,
        driver: true,
        parcels: {
          orderBy: { createdAt: 'desc' }
        },
        bookings: {
          include: {
            customer: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json({ trip });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser(['DISPATCHER', 'ADMIN']);
    const { id } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const driverId = data.driverId === '' || data.driverId === null ? null : typeof data.driverId === 'string' ? data.driverId : undefined;
    if (driverId === undefined) return NextResponse.json({ error: 'Tài xế không hợp lệ' }, { status: 400 });
    if (driverId && !(await prisma.driver.findFirst({ where: { id: driverId, status: 'ACTIVE' } }))) return NextResponse.json({ error: 'Tài xế không tồn tại hoặc đã khóa' }, { status: 404 });
    const before = await prisma.trip.findUnique({ where: { id }, select: { driverId: true } });
    if (!before) return NextResponse.json({ error: 'Không tìm thấy chuyến' }, { status: 404 });

    const trip = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({ where: { id }, data: { driverId }, include: { driver: true } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'TRIP_DRIVER_ASSIGNED', entityType: 'Trip', entityId: id, beforeData: JSON.stringify(before), afterData: JSON.stringify({ driverId }) } });
      return updated;
    });

    return NextResponse.json(trip);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Không đủ quyền gán tài xế' }, { status: 403 });
    console.error(error);
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
  }
}
