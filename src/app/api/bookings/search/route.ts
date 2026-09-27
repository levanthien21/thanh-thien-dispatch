import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  try { await requireUser(['AGENT', 'DISPATCHER', 'ADMIN']); } catch (error: unknown) {
    const status = error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? 'Không đủ quyền' : 'Vui lòng đăng nhập' }, { status });
  }
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q || q.length < 3) {
    return NextResponse.json({ bookings: [] });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { bookingCode: { contains: q } },
          { customer: { phone: { contains: q } } },
          { customer: { name: { contains: q } } }
        ]
      },
      include: {
        customer: true,
        trip: {
          include: {
            route: true,
            schedule: true,
            vehicle: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
