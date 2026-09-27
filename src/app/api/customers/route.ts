import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        bookings: {
          include: {
            trip: {
              include: {
                route: true,
                schedule: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(customers);
  } catch (error: any) {
    console.error('Customers API Error:', error);
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}
