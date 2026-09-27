import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { validSeatNumbers } from '@/lib/seat-layout';
import { isBookingPaymentStatus, paymentMethodForStatus } from '@/lib/payment-rules';
import { canAcceptTripBookings } from '@/lib/business-rules';
import { renderSmsTemplate, sendEsmsCustomerCareSms } from '@/lib/esms';

type TicketCounts = { adult: number; student: number };

class RequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function requiredText(value: unknown, label: string, maxLength = 200): string {
  if (typeof value !== 'string' || !value.trim()) throw new RequestError(`${label} là bắt buộc`);
  return value.trim().slice(0, maxLength);
}

function optionalText(value: unknown, maxLength = 1000): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function parseTicketCounts(value: unknown, passengerCount: number): TicketCounts {
  if (typeof value === 'string') {
    const adult = Number(value.match(/(?:^|,)ADULT:(\d+)(?:,|$)/)?.[1] ?? 0);
    const student = Number(value.match(/(?:^|,)STUDENT:(\d+)(?:,|$)/)?.[1] ?? 0);
    if (adult + student === passengerCount) return { adult, student };
  }
  if (value === 'STUDENT') return { adult: 0, student: passengerCount };
  if (value === 'ADULT' || value === undefined) return { adult: passengerCount, student: 0 };
  throw new RequestError('Số lượng loại vé không khớp số hành khách');
}

function parseSeats(value: unknown, passengerCount: number): string[] {
  if (typeof value !== 'string') throw new RequestError('Vui lòng chọn ghế');
  const seats = value.split(',').map((seat) => seat.trim().toUpperCase()).filter(Boolean);
  if (seats.length !== passengerCount || new Set(seats).size !== seats.length) {
    throw new RequestError('Số ghế phải duy nhất và khớp số hành khách');
  }
  if (seats.some((seat) => !/^[A-Z][A-Z0-9-]{0,9}$/.test(seat) || seat === 'DRIVER')) {
    throw new RequestError('Mã ghế không hợp lệ');
  }
  return seats;
}

async function calculatePrice(tx: Prisma.TransactionClient, routeId: string, travelDate: Date, counts: TicketCounts) {
  const configs = await tx.priceConfig.findMany({
    where: { ticketType: { in: ['ADULT', 'STUDENT'] }, OR: [{ routeId }, { routeId: null }] },
  });
  const holidays = await tx.holidayPrice.findMany({
    where: { active: true, startDate: { lte: travelDate }, endDate: { gte: travelDate }, OR: [{ routeId }, { routeId: null }] },
    orderBy: { createdAt: 'desc' },
  });
  const priceFor = (ticketType: 'ADULT' | 'STUDENT') => {
    const base = configs.find((item) => item.ticketType === ticketType && item.routeId === routeId)?.basePrice
      ?? configs.find((item) => item.ticketType === ticketType && item.routeId === null)?.basePrice
      ?? (ticketType === 'STUDENT' ? 120_000 : 130_000);
    const holiday = holidays.find((item) => item.routeId === routeId) ?? holidays.find((item) => item.routeId === null);
    if (!holiday) return base;
    const adjustment = holiday.adjustType === 'PERCENTAGE' ? base * holiday.adjustValue / 100 : holiday.adjustValue;
    return holiday.adjustMode === 'INCREASE' ? base + adjustment : Math.max(0, base - adjustment);
  };
  return Math.round(counts.adult * priceFor('ADULT') + counts.student * priceFor('STUDENT'));
}

function bookingCode(): string {
  const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
  return `TT${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser(['AGENT', 'DISPATCHER', 'ADMIN']);
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') throw new RequestError('Dữ liệu không hợp lệ');
    const data = body as Record<string, unknown>;
    const name = requiredText(data.name, 'Tên khách hàng', 100);
    const phone = requiredText(data.phone, 'Số điện thoại', 15).replace(/[\s.-]/g, '');
    if (!/^(?:0\d{9}|84\d{9})$/.test(phone)) throw new RequestError('Số điện thoại không hợp lệ');
    const tripId = requiredText(data.tripId, 'Chuyến đi', 50);
    const passengerCount = Number(data.passengerCount);
    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 20) throw new RequestError('Số hành khách không hợp lệ');
    const counts = parseTicketCounts(data.ticketType, passengerCount);
    const seats = parseSeats(data.seatNumbers, passengerCount);
    const isRoundTrip = data.isRoundTrip === true;
    const returnTripId = isRoundTrip ? requiredText(data.returnTripId, 'Chuyến về', 50) : null;
    const returnSeats = isRoundTrip ? parseSeats(data.returnSeatNumbers, passengerCount) : [];
    if (returnTripId === tripId) throw new RequestError('Chuyến về phải khác chuyến đi');
    const paymentStatus = data.paymentStatus ?? 'UNPAID';
    if (!isBookingPaymentStatus(paymentStatus)) throw new RequestError('Trạng thái thanh toán không hợp lệ');
    // Phương thức được suy ra từ trạng thái để không thể lưu tổ hợp mâu thuẫn.
    const paymentMethod = paymentMethodForStatus(paymentStatus);

    const result = await prisma.$transaction(async (tx) => {
      const tripIds = returnTripId ? [tripId, returnTripId] : [tripId];
      const trips = await tx.trip.findMany({
        where: { id: { in: tripIds }, status: { not: 'CANCELLED' } },
        include: { vehicle: true, route: true, schedule: true, bookings: { where: { status: { not: 'CANCELLED' } }, select: { passengerCount: true } } },
      });
      const outbound = trips.find((trip) => trip.id === tripId);
      const inbound = returnTripId ? trips.find((trip) => trip.id === returnTripId) : undefined;
      if (!outbound || (returnTripId && !inbound)) throw new RequestError('Chuyến xe không tồn tại hoặc đã hủy', 404);
      for (const trip of trips) {
        if (!canAcceptTripBookings(trip.travelDate, trip.schedule.departureTime, trip.status)) throw new RequestError(`Chuyến ${trip.schedule.departureTime} đã khởi hành hoặc đã kết thúc, không thể nhận thêm khách`, 409);
      }
      const allowedSeats = new Set(validSeatNumbers(outbound.vehicle.type));
      if (seats.some((seat) => !allowedSeats.has(seat))) {
        throw new RequestError(`Ghế không hợp lệ với xe ${outbound.vehicle.type}`, 400);
      }
      if (inbound) {
        const allowedReturnSeats = new Set(validSeatNumbers(inbound.vehicle.type));
        if (returnSeats.some((seat) => !allowedReturnSeats.has(seat))) throw new RequestError(`Ghế chiều về không hợp lệ với xe ${inbound.vehicle.type}`, 400);
      }
      for (const trip of trips) {
        const occupied = trip.bookings.reduce((sum, booking) => sum + booking.passengerCount, 0);
        if (occupied + passengerCount > trip.vehicle.seatCapacity) {
          throw new RequestError(`Chuyến ${trip.route.origin} - ${trip.route.destination} không còn đủ chỗ`, 409);
        }
      }
      const customer = await tx.customer.upsert({ where: { phone }, update: { name }, create: { phone, name } });
      const sameDay = Boolean(inbound && outbound.travelDate.toISOString().slice(0, 10) === inbound.travelDate.toISOString().slice(0, 10));
      const createBooking = async (targetTrip: typeof outbound, isReturn: boolean) => {
        const subtotal = await calculatePrice(tx, targetTrip.routeId, targetTrip.travelDate, counts);
        const discount = sameDay ? 20_000 * passengerCount : 0;
        const created = await tx.booking.create({
          data: {
            bookingCode: bookingCode(), customerId: customer.id, tripId: targetTrip.id, passengerCount,
            seatNumbers: (isReturn ? returnSeats : seats).join(','),
            pickupLocation: requiredText(isReturn ? data.returnPickupLocation : data.pickupLocation, 'Điểm đón', 250),
            dropoffLocation: requiredText(isReturn ? data.returnDropoffLocation : data.dropoffLocation, 'Điểm trả', 250),
            ticketType: `ADULT:${counts.adult},STUDENT:${counts.student}`,
            paymentMethod, paymentStatus,
            notes: `${optionalText(data.notes)}${isReturn ? ' (Vé khứ hồi chiều về)' : ''}`.trim() || null,
            subtotal, discount, total: Math.max(0, subtotal - discount), createdBy: actor.id, status: 'CONFIRMED',
          },
        });
        if (paymentStatus === 'PAID') {
          await tx.payment.create({ data: { bookingId: created.id, amount: created.total, method: paymentMethod, status: 'COMPLETED' } });
        }
        return created;
      };
      const outboundBooking = await createBooking(outbound, false);
      for (const seatNumber of seats) {
        await tx.$executeRaw`
          INSERT INTO BookingSeat (id, bookingId, tripId, seatNumber, createdAt)
          VALUES (${randomUUID()}, ${outboundBooking.id}, ${tripId}, ${seatNumber}, CURRENT_TIMESTAMP)
        `;
      }
      const bookings = [outboundBooking];
      if (inbound) {
        const inboundBooking = await createBooking(inbound, true);
        for (const seatNumber of returnSeats) {
          await tx.$executeRaw`
            INSERT INTO BookingSeat (id, bookingId, tripId, seatNumber, createdAt)
            VALUES (${randomUUID()}, ${inboundBooking.id}, ${inbound.id}, ${seatNumber}, CURRENT_TIMESTAMP)
          `;
        }
        bookings.push(inboundBooking);
      }
      for (const booking of bookings) {
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            action: 'BOOKING_CREATED',
            entityType: 'Booking',
            entityId: booking.id,
            afterData: JSON.stringify({ bookingCode: booking.bookingCode, tripId: booking.tripId, passengerCount: booking.passengerCount, total: booking.total }),
          },
        });
      }
      return { bookings, booking: outboundBooking, smsContext: { route: `${outbound.route.origin} - ${outbound.route.destination}`, time: `${outbound.travelDate.toLocaleDateString('vi-VN')} ${outbound.schedule.departureTime}`, pickup: outboundBooking.pickupLocation, dropoff: outboundBooking.dropoffLocation, seats: outboundBooking.seatNumbers ?? '', total: new Intl.NumberFormat('vi-VN').format(outboundBooking.total) } };
    });

    let sms: { requested: boolean; status: 'SENT' | 'FAILED' | 'SKIPPED'; error?: string } = { requested: false, status: 'SKIPPED' };
    if (data.sendSms === true || data.sendZalo === true) {
      sms = { requested: true, status: 'SKIPPED' };
      const template = await prisma.smsTemplate.findUnique({ where: { type: 'BOOKING_CONFIRMATION' } });
      if (template?.isActive) {
        const content = renderSmsTemplate(template.content, { name, booking_code: result.booking.bookingCode, ...result.smsContext });
        try {
          const providerResult = await sendEsmsCustomerCareSms({ phone, content, requestId: result.booking.id });
          sms = providerResult.accepted ? { requested: true, status: 'SENT' } : { requested: true, status: 'FAILED', error: providerResult.error };
        } catch (error) {
          sms = { requested: true, status: 'FAILED', error: error instanceof Error ? error.message : 'Không thể kết nối eSMS' };
        }
        await prisma.smsLog.create({ data: { phone, content, status: sms.status, provider: 'ESMS', bookingId: result.booking.id } });
      }
    }
    return NextResponse.json({ success: true, bookings: result.bookings, booking: result.booking, sms }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Không đủ quyền' }, { status: 403 });
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ghế vừa được người khác đặt. Vui lòng chọn lại.' }, { status: 409 });
    }
    console.error('Booking Error:', error);
    return NextResponse.json({ error: 'Không thể tạo booking' }, { status: 500 });
  }
}
