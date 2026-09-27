import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { randomUUID } from 'node:crypto';
import { validSeatNumbers } from '@/lib/seat-layout';
import { canAcceptTripBookings } from '@/lib/business-rules';

const ticketCounts = (value: string, total: number) => {
  const adult = Number(value.match(/ADULT:(\d+)/)?.[1] ?? (value === 'STUDENT' ? 0 : total));
  const student = Number(value.match(/STUDENT:(\d+)/)?.[1] ?? (value === 'STUDENT' ? total : 0));
  return adult + student === total ? { adult, student } : null;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(['AGENT', 'DISPATCHER', 'ADMIN']);
    const { id } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    const status = data.status === undefined ? undefined : String(data.status);
    const paymentStatus = data.paymentStatus === undefined ? undefined : String(data.paymentStatus);
    const paymentMethod = data.paymentMethod === undefined ? undefined : String(data.paymentMethod);
    if (status && !['CONFIRMED', 'CANCELLED', 'HOLD', 'BOARDED', 'NO_SHOW'].includes(status)) {
      return NextResponse.json({ error: 'Trạng thái vé không hợp lệ' }, { status: 400 });
    }
    if (paymentStatus && !['UNPAID', 'PARTIAL', 'PAID'].includes(paymentStatus)) {
      return NextResponse.json({ error: 'Trạng thái thanh toán không hợp lệ' }, { status: 400 });
    }
    if (paymentMethod && !['CASH', 'TRANSFER'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Phương thức thanh toán không hợp lệ' }, { status: 400 });
    }
    const current = await prisma.booking.findUnique({ where: { id }, include: { trip: { include: { vehicle: true, schedule: true } } } });
    if (!current) return NextResponse.json({ error: 'Không tìm thấy booking' }, { status: 404 });
    if (paymentStatus === 'PARTIAL' && current.paymentStatus !== 'PARTIAL') {
      return NextResponse.json({ error: 'Cần nhập số tiền cọc cụ thể; chức năng này chưa hỗ trợ thay đổi nhanh.' }, { status: 409 });
    }
    if (current.paymentStatus === 'PAID' && paymentStatus && paymentStatus !== 'PAID') {
      return NextResponse.json({ error: 'Vé đã thanh toán chỉ có thể giảm trạng thái qua quy trình hoàn tiền.' }, { status: 409 });
    }
    const requestedPassengerCount = data.passengerCount === undefined ? current.passengerCount : Number(data.passengerCount);
    const requestedSeats = data.seatNumbers === undefined ? current.seatNumbers : String(data.seatNumbers);
    const requestedTicketType = data.ticketType === undefined ? current.ticketType : String(data.ticketType);
    const seats = requestedSeats?.split(',').map((seat) => seat.trim().toUpperCase()).filter(Boolean) ?? [];
    const counts = ticketCounts(requestedTicketType, requestedPassengerCount);
    const seatsChanged = requestedPassengerCount !== current.passengerCount || requestedSeats !== current.seatNumbers || requestedTicketType !== current.ticketType;
    if (!Number.isInteger(requestedPassengerCount) || requestedPassengerCount < 1 || seats.length !== requestedPassengerCount || new Set(seats).size !== seats.length) return NextResponse.json({ error: 'Số ghế phải duy nhất và khớp số hành khách' }, { status: 400 });
    if (!counts) return NextResponse.json({ error: 'Số người lớn và sinh viên phải khớp số ghế' }, { status: 400 });
    const allowedSeats = new Set(validSeatNumbers(current.trip.vehicle.type));
    if (seats.some((seat) => !allowedSeats.has(seat))) return NextResponse.json({ error: 'Ghế không hợp lệ với phương tiện của chuyến' }, { status: 400 });
    if (seatsChanged && !canAcceptTripBookings(current.trip.travelDate, current.trip.schedule.departureTime, current.trip.status)) return NextResponse.json({ error: 'Chuyến đã khởi hành nên không thể thêm hoặc xóa ghế' }, { status: 409 });

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = current.subtotal;
      let discount = current.discount;
      let total = current.total;
      if (seatsChanged) {
        const occupied = await tx.bookingSeat.findMany({ where: { tripId: current.tripId, bookingId: { not: id }, seatNumber: { in: seats } }, select: { seatNumber: true } });
        if (occupied.length) throw new Error(`SEAT_TAKEN:${occupied.map((item) => item.seatNumber).join(',')}`);
        const configs = await tx.priceConfig.findMany({ where: { ticketType: { in: ['ADULT', 'STUDENT'] }, OR: [{ routeId: current.trip.routeId }, { routeId: null }] } });
        const holidays = await tx.holidayPrice.findMany({ where: { active: true, startDate: { lte: current.trip.travelDate }, endDate: { gte: current.trip.travelDate }, OR: [{ routeId: current.trip.routeId }, { routeId: null }] }, orderBy: { createdAt: 'desc' } });
        const unitPrice = (kind: 'ADULT' | 'STUDENT') => {
          const base = configs.find((item) => item.ticketType === kind && item.routeId === current.trip.routeId)?.basePrice ?? configs.find((item) => item.ticketType === kind && item.routeId === null)?.basePrice ?? (kind === 'STUDENT' ? 120000 : 130000);
          const holiday = holidays.find((item) => item.routeId === current.trip.routeId) ?? holidays.find((item) => item.routeId === null);
          if (!holiday) return base;
          const adjustment = holiday.adjustType === 'PERCENTAGE' ? base * holiday.adjustValue / 100 : holiday.adjustValue;
          return holiday.adjustMode === 'INCREASE' ? base + adjustment : Math.max(0, base - adjustment);
        };
        subtotal = Math.round(counts.adult * unitPrice('ADULT') + counts.student * unitPrice('STUDENT'));
        discount = Math.round((current.discount / Math.max(1, current.passengerCount)) * requestedPassengerCount);
        total = Math.max(0, subtotal - discount);
        await tx.bookingSeat.deleteMany({ where: { bookingId: id } });
        for (const seatNumber of seats) await tx.bookingSeat.create({ data: { id: randomUUID(), bookingId: id, tripId: current.tripId, seatNumber } });
      }
      const paid = await tx.payment.aggregate({ where: { bookingId: id, status: 'COMPLETED' }, _sum: { amount: true } });
      const paidAmount = paid._sum.amount ?? 0;
      const effectivePaymentStatus = seatsChanged && paidAmount > 0 ? (paidAmount >= total ? 'PAID' : 'PARTIAL') : paymentStatus;
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status,
          pickupLocation: typeof data.pickupLocation === 'string' ? data.pickupLocation.trim().slice(0, 250) : undefined,
          dropoffLocation: typeof data.dropoffLocation === 'string' ? data.dropoffLocation.trim().slice(0, 250) : undefined,
          paymentMethod,
          notes: typeof data.notes === 'string' ? data.notes.trim().slice(0, 1000) : undefined,
          passengerCount: seatsChanged ? requestedPassengerCount : undefined,
          seatNumbers: seatsChanged ? seats.join(',') : undefined,
          ticketType: seatsChanged ? requestedTicketType : undefined,
          subtotal: seatsChanged ? subtotal : undefined,
          discount: seatsChanged ? discount : undefined,
          total: seatsChanged ? total : undefined,
          paymentStatus: effectivePaymentStatus,
        },
      });
      if (current.paymentStatus !== 'PAID' && updated.paymentStatus === 'PAID') {
        const paid = await tx.payment.aggregate({ where: { bookingId: id, status: 'COMPLETED' }, _sum: { amount: true } });
        const remaining = Math.max(0, updated.total - (paid._sum.amount ?? 0));
        if (remaining > 0) await tx.payment.create({ data: { bookingId: id, amount: remaining, method: updated.paymentMethod, status: 'COMPLETED' } });
      }
      if (status === 'CANCELLED') {
        await tx.$executeRaw`DELETE FROM BookingSeat WHERE bookingId = ${id}`;
        if (current.status !== 'CANCELLED') await tx.bookingChange.create({ data: { bookingId: id, action: 'CANCEL', fromTripId: current.tripId, fromSeats: current.seatNumbers, reason: typeof data.cancelReason === 'string' ? data.cancelReason.trim().slice(0, 500) || null : null, changedBy: actor.id } });
      }
      if (seatsChanged) await tx.bookingChange.create({ data: { bookingId: id, action: 'SEATS_ADJUSTED', fromTripId: current.tripId, toTripId: current.tripId, fromSeats: current.seatNumbers, toSeats: seats.join(','), reason: `Điều chỉnh từ ${current.passengerCount} xuống/cộng thành ${requestedPassengerCount} ghế`, changedBy: actor.id } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: status === 'CANCELLED' ? 'BOOKING_CANCELLED' : 'BOOKING_UPDATED',
          entityType: 'Booking',
          entityId: id,
          beforeData: JSON.stringify({ status: current.status, paymentStatus: current.paymentStatus, paymentMethod: current.paymentMethod }),
          afterData: JSON.stringify({ status: updated.status, paymentStatus: updated.paymentStatus, paymentMethod: updated.paymentMethod }),
        },
      });
      return { updated, refundDue: Math.max(0, paidAmount - total) };
    });

    return NextResponse.json({ booking: result.updated, refundDue: result.refundDue });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Không đủ quyền' }, { status: 403 });
    if (error instanceof Error && error.message.startsWith('SEAT_TAKEN:')) return NextResponse.json({ error: `Ghế ${error.message.slice(11)} vừa được khách khác đặt. Vui lòng chọn lại.` }, { status: 409 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
