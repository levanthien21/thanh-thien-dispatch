import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(['AGENT', 'DISPATCHER', 'ADMIN']);
    const { id } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const text = (key: string, max = 150) => typeof data[key] === 'string' ? data[key].trim().slice(0, max) : '';
    const fee = Number(data.fee);
    const status = String(data.status);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100_000_000 || !['PENDING', 'DELIVERING', 'DELIVERED', 'CANCELLED'].includes(status)) return NextResponse.json({ error: 'Phí hoặc trạng thái không hợp lệ' }, { status: 400 });

    const parcel = await prisma.parcel.update({
      where: { id },
      data: {
        senderName: text('senderName'),
        senderPhone: text('senderPhone', 15).replace(/\D/g, ''),
        receiverName: text('receiverName'),
        receiverPhone: text('receiverPhone', 15).replace(/\D/g, ''),
        description: text('description', 500),
        fee,
        status,
        tripId: text('tripId', 50),
        pickupLocation: text('pickupLocation', 250) || null,
        dropoffLocation: text('dropoffLocation', 250) || null,
        notes: text('notes', 1000) || null
      }
    });

    return NextResponse.json(parcel);
  } catch (error) {
    console.error('Error updating parcel:', error);
    return NextResponse.json({ error: 'Failed to update parcel' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(['AGENT', 'DISPATCHER', 'ADMIN']);
    const { id } = await params;
    await prisma.parcel.update({ where: { id }, data: { status: 'CANCELLED' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting parcel:', error);
    return NextResponse.json({ error: 'Failed to delete parcel' }, { status: 500 });
  }
}
