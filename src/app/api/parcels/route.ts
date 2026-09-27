import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('tripId');

  try {
    const whereClause = tripId ? { tripId } : {};
    const parcels = await prisma.parcel.findMany({
      where: whereClause,
      include: {
        trip: {
          include: {
            route: true,
            driver: true,
            schedule: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(parcels);
  } catch (error) {
    console.error('Error fetching parcels:', error);
    return NextResponse.json({ error: 'Failed to fetch parcels' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser(['AGENT', 'DISPATCHER', 'ADMIN']);
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const text = (key: string, max = 150) => typeof data[key] === 'string' ? data[key].trim().slice(0, max) : '';
    const fee = Number(data.fee);
    const senderPhone = text('senderPhone', 15).replace(/\D/g, '');
    const receiverPhone = text('receiverPhone', 15).replace(/\D/g, '');
    const tripId = text('tripId', 50);
    if (!text('senderName') || !text('receiverName') || !text('description', 500) || !/^(?:0\d{9}|84\d{9})$/.test(senderPhone) || !/^(?:0\d{9}|84\d{9})$/.test(receiverPhone) || !tripId || !Number.isFinite(fee) || fee < 0 || fee > 100_000_000) return NextResponse.json({ error: 'Thông tin ký gửi không hợp lệ' }, { status: 400 });
    const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { id: true, status: true } });
    if (!trip || trip.status === 'CANCELLED') return NextResponse.json({ error: 'Chuyến xe không tồn tại hoặc đã hủy' }, { status: 404 });
    const parcel = await prisma.parcel.create({
      data: {
        senderName: text('senderName'), senderPhone, receiverName: text('receiverName'), receiverPhone,
        description: text('description', 500), fee, status: 'PENDING', tripId,
        pickupLocation: text('pickupLocation', 250) || null, dropoffLocation: text('dropoffLocation', 250) || null,
        notes: text('notes', 1000) || null
      }
    });
    return NextResponse.json(parcel, { status: 201 });
  } catch (error) {
    console.error('Error creating parcel:', error);
    return NextResponse.json({ error: 'Failed to create parcel' }, { status: 500 });
  }
}
