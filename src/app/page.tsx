import styles from "./page.module.css";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";
import { parseDateInput } from "@/lib/business-rules";

export default async function Home(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams;
  // Define "Selected Date" boundary
  const localToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const requestedDate = searchParams?.date || localToday;
  const selectedDate = parseDateInput(requestedDate) ?? parseDateInput(localToday)!;
  const selectedDateStr = parseDateInput(requestedDate) ? requestedDate : localToday;
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);

  // Fetch Trips for selected date
  const trips = await prisma.trip.findMany({
    where: { 
      travelDate: {
        gte: selectedDate,
        lt: nextDate
      },
      schedule: {
        active: true
      }
    },
    include: {
      route: true,
      vehicle: true,
      schedule: true,
      driver: true,
      bookings: {
        where: { status: { not: "CANCELLED" } }
      }
    },
    orderBy: { schedule: { departureTime: 'asc' } }
  });

  // Calculate stats based on today's trips
  let totalBookings = 0;
  let totalPassengers = 0;
  let confirmedPassengers = 0;
  let holdPassengers = 0;
  let totalRevenue = 0;
  let totalCapacity = 0;

  trips.forEach(trip => {
    totalCapacity += trip.vehicle.seatCapacity;
    trip.bookings.forEach(b => {
      totalBookings++;
      totalPassengers += b.passengerCount;
      if (b.status === "CONFIRMED" || b.status === "BOARDED") {
        confirmedPassengers += b.passengerCount;
        totalRevenue += b.total; // Tính doanh thu ước tính các vé đã xác nhận/đã lên xe
      }
      if (b.status === "HOLD") holdPassengers += b.passengerCount;
    });
  });

  const occupancyRate = totalCapacity > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0;

  // Format Date for Header
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const todayFormatted = selectedDate.toLocaleDateString('vi-VN', dateOptions);

  const activeRoutes = await prisma.route.findMany({
    where: { schedules: { some: { active: true } } },
    select: { id: true },
  });

  // Group trips by route
  const tripsByRoute = trips.reduce((acc, trip) => {
    const routeName = `${trip.route.origin} → ${trip.route.destination}`;
    if (!acc[routeName]) acc[routeName] = [];
    acc[routeName].push(trip);
    return acc;
  }, {} as Record<string, typeof trips>);

  return (
    <DashboardClient 
      todayFormatted={todayFormatted} 
      selectedDateStr={selectedDateStr} 
      stats={{ totalBookings, totalPassengers, totalRevenue, occupancyRate }} 
      tripsByRoute={tripsByRoute} 
      totalTrips={trips.length} 
      activeRouteIds={activeRoutes.map((route) => route.id)}
    />
  );
}
