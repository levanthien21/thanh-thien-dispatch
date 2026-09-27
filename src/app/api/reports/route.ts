import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');
  const groupBy = searchParams.get('groupBy') || 'day';

  if (!startDateStr || !endDateStr) {
    return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
  }

  try {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    // 1. Fetch all trips in range with bookings and parcels
    const trips = await prisma.trip.findMany({
      where: {
        travelDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        route: true,
        schedule: true,
        driver: true,
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          include: { customer: true, payments: { where: { status: 'COMPLETED' } } }
        },
        parcels: {
          where: { status: { not: 'CANCELLED' } }
        }
      },
      orderBy: {
        travelDate: 'asc'
      }
    });

    let totalPassengers = 0;
    let ticketRevenue = 0;
    let ticketCollected = 0;
    let parcelCount = 0;
    let parcelRevenue = 0;
    const chartDataMap: Record<string, any> = {};
    const tripStats: any[] = [];
    const routeStatsMap: Record<string, any> = {};
    const driverStatsMap: Record<string, any> = {};
    const customerStatsMap: Record<string, any> = {};

    // Aggregate data
    trips.forEach(trip => {
      const fullDate = new Date(trip.travelDate).toISOString().split('T')[0];
      let dateKey = fullDate;
      if (groupBy === 'month') {
        dateKey = fullDate.substring(0, 7); // YYYY-MM
      } else if (groupBy === 'year') {
        dateKey = fullDate.substring(0, 4); // YYYY
      }
      
      if (!chartDataMap[dateKey]) {
        chartDataMap[dateKey] = {
          date: dateKey,
          ticketRevenue: 0,
          parcelRevenue: 0,
          totalRevenue: 0
        };
      }

      // Calculate Trip's Ticket Revenue
      const tripTicketRevenue = trip.bookings.reduce((sum, b) => sum + b.total, 0);
      const tripTicketCollected = trip.bookings.reduce((sum, b) => sum + b.payments.reduce((paid, payment) => paid + payment.amount, 0), 0);
      const tripPassengers = trip.bookings.reduce((sum, b) => sum + b.passengerCount, 0);
      
      // Calculate Trip's Parcel Revenue
      const tripParcelRevenue = trip.parcels.reduce((sum, p) => sum + p.fee, 0);
      const tripParcelCount = trip.parcels.length;

      // Add to global totals
      totalPassengers += tripPassengers;
      ticketRevenue += tripTicketRevenue;
      ticketCollected += tripTicketCollected;
      parcelCount += tripParcelCount;
      parcelRevenue += tripParcelRevenue;

      // Add to chart
      chartDataMap[dateKey].ticketRevenue += tripTicketRevenue;
      chartDataMap[dateKey].parcelRevenue += tripParcelRevenue;
      chartDataMap[dateKey].totalRevenue += (tripTicketRevenue + tripParcelRevenue);

      // Add to trip detailed stats
      tripStats.push({
        id: trip.id,
        date: dateKey,
        routeName: `${trip.route.origin} -> ${trip.route.destination}`,
        time: trip.schedule?.departureTime || 'N/A',
        passengers: tripPassengers,
        ticketRevenue: tripTicketRevenue,
        parcels: tripParcelCount,
        parcelRevenue: tripParcelRevenue,
        total: tripTicketRevenue + tripParcelRevenue
      });

      // Route stats
      const routeName = `${trip.route.origin} -> ${trip.route.destination}`;
      if (!routeStatsMap[routeName]) {
        routeStatsMap[routeName] = { name: routeName, ticketRevenue: 0, parcelRevenue: 0, totalRevenue: 0, tripsCount: 0 };
      }
      routeStatsMap[routeName].tripsCount += 1;
      routeStatsMap[routeName].ticketRevenue += tripTicketRevenue;
      routeStatsMap[routeName].parcelRevenue += tripParcelRevenue;
      routeStatsMap[routeName].totalRevenue += (tripTicketRevenue + tripParcelRevenue);

      // Driver stats
      if (trip.driver) {
        if (!driverStatsMap[trip.driver.id]) {
          driverStatsMap[trip.driver.id] = { name: trip.driver.name, phone: trip.driver.phone, tripsCount: 0, totalRevenue: 0 };
        }
        driverStatsMap[trip.driver.id].tripsCount += 1;
        driverStatsMap[trip.driver.id].totalRevenue += (tripTicketRevenue + tripParcelRevenue);
      }

      // Customer stats
      trip.bookings.forEach(b => {
        if (!customerStatsMap[b.customerId]) {
          customerStatsMap[b.customerId] = { 
            id: b.customerId, 
            name: b.customer?.name || 'Khách vãng lai', 
            phone: b.customer?.phone || '', 
            ticketsCount: 0, 
            totalSpent: 0 
          };
        }
        customerStatsMap[b.customerId].ticketsCount += b.passengerCount;
        customerStatsMap[b.customerId].totalSpent += b.total;
      });
    });

    // Convert map to array and sort by date
    const chartData = Object.values(chartDataMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
    
    // Sort trip stats by date descending
    tripStats.sort((a, b) => b.date.localeCompare(a.date));

    const routeStats = Object.values(routeStatsMap).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
    const driverStats = Object.values(driverStatsMap).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
    const topCustomers = Object.values(customerStatsMap).sort((a: any, b: any) => b.totalSpent - a.totalSpent).slice(0, 5);

    return NextResponse.json({
      totalTrips: trips.length,
      totalPassengers,
      ticketRevenue,
      ticketCollected,
      ticketOutstanding: Math.max(0, ticketRevenue - ticketCollected),
      parcelCount,
      parcelRevenue,
      totalRevenue: ticketRevenue + parcelRevenue,
      chartData,
      tripStats,
      routeStats,
      driverStats,
      topCustomers
    });

  } catch (error: any) {
    console.error('Reports API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
