import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { layoutKey, SEAT_LAYOUTS } from '@/lib/seat-layout';
import { canAcceptTripBookings } from '@/lib/business-rules';

const cleanSeats = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.map(String).map((seat) => seat.trim()).filter(Boolean))]
  : [];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser(['AGENT', 'DISPATCHER', 'ADMIN']);
    const { id } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const targetTripId = typeof data.targetTripId === 'string' ? data.targetTripId.trim() : '';
    const seats = cleanSeats(data.seatNumbers);
    const reason = typeof data.reason === 'string' ? data.reason.trim().slice(0, 500) : '';
    if (!targetTripId) return NextResponse.json({ error: 'Vui lòng chọn chuyến mới' }, { status: 400 });

    const current = await prisma.booking.findUnique({
      where: { id },
      include: { trip: { include: { route: true, schedule: true } } },
    });
    if (!current) return NextResponse.json({ error: 'Không tìm thấy vé' }, { status: 404 });
    if (current.status === 'CANCELLED') return NextResponse.json({ error: 'Vé đã hủy không thể chuyển chuyến' }, { status: 409 });
    if (current.status === 'BOARDED') return NextResponse.json({ error: 'Khách đã lên xe nên không thể chuyển vé' }, { status: 409 });
    if (!reason) return NextResponse.json({ error: 'Vui lòng nhập lý do chuyển vé' }, { status: 400 });
    if (targetTripId === current.tripId) return NextResponse.json({ error: 'Chuyến mới đang trùng với chuyến hiện tại' }, { status: 409 });
    if (seats.length !== current.passengerCount) return NextResponse.json({ error: `Vui lòng chọn đúng ${current.passengerCount} ghế` }, { status: 400 });

    const target = await prisma.trip.findUnique({
      where: { id: targetTripId },
      include: { route: true, schedule: true, vehicle: true },
    });
    if (!target || target.status === 'CANCELLED' || target.status === 'COMPLETED') return NextResponse.json({ error: 'Chuyến mới không còn hoạt động' }, { status: 404 });
    if (target.routeId !== current.trip.routeId) return NextResponse.json({ error: 'Chỉ được đổi sang chuyến cùng tuyến và cùng chiều' }, { status: 409 });

    if (!canAcceptTripBookings(target.travelDate, target.schedule.departureTime, target.status)) return NextResponse.json({ error: 'Không thể chuyển sang chuyến đã khởi hành hoặc hoàn thành' }, { status: 409 });

    const allowedSeats = new Set(SEAT_LAYOUTS[layoutKey(target.vehicle.type)].filter(Boolean).flat().filter((seat) => !seat.empty && seat.type !== 'driver').map((seat) => seat.id));
    if (seats.some((seat) => !allowedSeats.has(seat))) return NextResponse.json({ error: 'Sơ đồ ghế không hợp lệ với xe của chuyến mới' }, { status: 400 });

    const changed = await prisma.$transaction(async (tx) => {
      const occupied = await tx.bookingSeat.findMany({ where: { tripId: targetTripId, seatNumber: { in: seats } }, select: { seatNumber: true } });
      if (occupied.length) throw new Error(`SEAT_TAKEN:${occupied.map((seat) => seat.seatNumber).join(',')}`);
      await tx.bookingSeat.deleteMany({ where: { bookingId: id } });
      for (const seatNumber of seats) await tx.bookingSeat.create({ data: { id: randomUUID(), bookingId: id, tripId: targetTripId, seatNumber } });
      const updated = await tx.booking.update({
        where: { id },
        data: { tripId: targetTripId, seatNumbers: seats.join(','), status: current.status === 'HOLD' ? 'HOLD' : 'CONFIRMED' },
      });
      await tx.bookingChange.create({ data: { bookingId: id, action: 'TRANSFER', fromTripId: current.tripId, toTripId: targetTripId, fromSeats: current.seatNumbers, toSeats: seats.join(','), reason: reason || null, changedBy: actor.id } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'BOOKING_TRANSFERRED', entityType: 'Booking', entityId: id, beforeData: JSON.stringify({ tripId: current.tripId, seats: current.seatNumbers }), afterData: JSON.stringify({ tripId: targetTripId, seats, reason }) } });
      return updated;
    });
    return NextResponse.json({ booking: changed, message: 'Đã chuyển chuyến thành công' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Không đủ quyền chuyển vé' }, { status: 403 });
    if (error instanceof Error && error.message.startsWith('SEAT_TAKEN:')) return NextResponse.json({ error: `Ghế ${error.message.slice(11)} vừa được khách khác đặt. Vui lòng chọn lại.` }, { status: 409 });
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: 'Ghế vừa được khách khác đặt. Vui lòng chọn lại.' }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: 'Không thể chuyển chuyến' }, { status: 500 });
  }
}
