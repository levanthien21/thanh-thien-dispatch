import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.smsLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 logs for performance
      include: {
        booking: {
          select: {
            bookingCode: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
