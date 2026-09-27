import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 1. Search Bookings (used by /search page)
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { bookingCode: { contains: q.toUpperCase() } },
          { customer: { phone: { contains: q } } },
          { customer: { name: { contains: q } } },
        ]
      },
      include: {
        customer: true,
        trip: {
          include: {
            route: true,
            schedule: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const results = bookings.map(b => ({
      id: b.id,
      bookingCode: b.bookingCode,
      customerName: b.customer.name,
      customerPhone: b.customer.phone,
      routeInfo: `${b.trip.route.origin} → ${b.trip.route.destination}`,
      timeInfo: `${new Date(b.trip.travelDate).toLocaleDateString('vi-VN')} lúc ${b.trip.schedule.departureTime}`,
      status: b.status,
      tripId: b.tripId,
      // Pass along full bookings array structure so /booking auto-fill logic (which expects match.bookings) works
      bookings: [b] 
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
