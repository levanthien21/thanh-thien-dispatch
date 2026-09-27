import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');

  if (!dateStr) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 });
  }

  try {
    const travelDate = new Date(dateStr);
    
    // Get all trips for this date across all routes
    const trips = await prisma.trip.findMany({
      where: {
        travelDate: {
          gte: new Date(travelDate.setHours(0, 0, 0, 0)),
          lte: new Date(travelDate.setHours(23, 59, 59, 999))
        }
      },
      include: {
        schedule: true,
        vehicle: true,
        driver: true,
        route: true
      },
      orderBy: {
        schedule: {
          departureTime: 'asc'
        }
      }
    });

    return NextResponse.json({ trips });
  } catch (error: any) {
    console.error('Parcel Trips API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
