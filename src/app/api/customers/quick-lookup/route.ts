import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/business-rules';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone') || '';
    if (!rawPhone) {
      return NextResponse.json({ customer: null });
    }

    const cleanPhone = normalizePhone(rawPhone);
    const altPhone = cleanPhone.startsWith('0') ? '84' + cleanPhone.slice(1) : ('0' + cleanPhone.replace(/^84/, ''));

    // Try finding customer by phone or alternate format
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: rawPhone },
          { phone: altPhone }
        ]
      },
      include: {
        bookings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            trip: {
              include: {
                route: true
              }
            }
          }
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ customer: null });
    }

    const totalBookings = await prisma.booking.count({
      where: { customerId: customer.id }
    });

    const lastBooking = customer.bookings[0];

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        bookingsCount: totalBookings,
        isVip: totalBookings >= 5,
        notes: customer.note || (totalBookings >= 5 ? 'Khách hàng thân thiết' : 'Khách hàng nhà xe'),
        lastPickupLocation: lastBooking?.pickupLocation || '',
        lastDropoffLocation: lastBooking?.dropoffLocation || '',
        lastRoute: lastBooking?.trip?.route ? `${lastBooking.trip.route.origin} → ${lastBooking.trip.route.destination}` : ''
      }
    });
  } catch (error: any) {
    console.error('Quick customer lookup error:', error);
    return NextResponse.json({ customer: null, error: error.message }, { status: 500 });
  }
}
