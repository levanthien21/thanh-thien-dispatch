import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const callRecords = await prisma.callRecord.findMany({
      take: Math.min(limit, 100),
      orderBy: { startedAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            bookingCode: true,
            pickupLocation: true,
            dropoffLocation: true,
            customer: {
              select: {
                name: true,
                phone: true
              }
            }
          }
        }
      }
    });

    // Match caller numbers with customers to return customer names
    const callerPhones = callRecords.map(r => r.callerNumber);
    const customers = await prisma.customer.findMany({
      where: { phone: { in: callerPhones } },
      select: { phone: true, name: true }
    });

    const phoneToName = new Map(customers.map(c => [c.phone, c.name]));

    const formatted = callRecords.map(record => ({
      id: record.id,
      callerNumber: record.callerNumber,
      customerName: record.booking?.customer?.name || phoneToName.get(record.callerNumber) || 'Khách vãng lai',
      direction: record.callerNumber.startsWith('out_') ? 'outbound' : 'inbound',
      startedAt: record.startedAt.toISOString(),
      duration: record.duration || 0,
      status: (record.duration && record.duration > 0) ? 'COMPLETED' : 'MISSED',
      bookingId: record.bookingId,
      bookingCode: record.booking?.bookingCode,
      recordingStatus: record.recordingStatus
    }));

    return NextResponse.json({ calls: formatted });
  } catch (error: any) {
    console.error('Fetch calls error:', error);
    return NextResponse.json({ error: 'Failed to load call history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { callerNumber, duration, startedAt, bookingId } = body;

    if (!callerNumber) {
      return NextResponse.json({ error: 'callerNumber is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    const user = await verifySessionToken(sessionToken);

    const callRecord = await prisma.callRecord.create({
      data: {
        callerNumber,
        agentId: user?.id || null,
        bookingId: bookingId || null,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: new Date(),
        duration: typeof duration === 'number' ? duration : 0,
        recordingStatus: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, callRecord });
  } catch (error: any) {
    console.error('Create call record error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save call record' }, { status: 500 });
  }
}
