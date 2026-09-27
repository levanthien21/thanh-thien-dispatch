import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(['DISPATCHER', 'ADMIN']);
    const { id } = await params;

    // Find all UNPAID CASH bookings for this trip
    const bookings = await prisma.booking.findMany({
      where: {
        tripId: id,
        paymentStatus: 'UNPAID',
        paymentMethod: 'CASH',
        status: { not: 'CANCELLED' }
      }
    });

    if (bookings.length === 0) {
      return NextResponse.json({ message: 'No unpaid cash bookings to reconcile' });
    }

    const reconciliation = await prisma.$transaction(async (tx) => {
      let count = 0;
      let amount = 0;
      for (const booking of bookings) {
        const changed = await tx.booking.updateMany({ where: { id: booking.id, paymentStatus: 'UNPAID' }, data: { paymentStatus: 'PAID' } });
        if (changed.count === 0) continue;
        await tx.payment.create({ data: { bookingId: booking.id, amount: booking.total, method: 'CASH', status: 'COMPLETED' } });
        count += 1;
        amount += booking.total;
      }
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'TRIP_CASH_RECONCILED',
          entityType: 'Trip',
          entityId: id,
          beforeData: JSON.stringify({ bookingIds: bookings.map((booking) => booking.id), paymentStatus: 'UNPAID' }),
          afterData: JSON.stringify({ count, amount, paymentStatus: 'PAID' }),
        },
      });
      return { count, amount };
    });

    return NextResponse.json({ success: true, count: reconciliation.count, amount: reconciliation.amount });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Không đủ quyền đối soát' }, { status: 403 });
    console.error(error);
    return NextResponse.json({ error: 'Failed to reconcile' }, { status: 500 });
  }
}
