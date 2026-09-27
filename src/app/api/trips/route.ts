import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { chooseAvailableVehicle } from '@/lib/business-rules';

// POST is intentional: ensuring daily trips may create missing Trip rows.
export async function POST(request: Request) {
  try {
    await requireUser(['AGENT', 'DISPATCHER', 'ADMIN']);
  } catch (error: unknown) {
    const status = error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? 'Không đủ quyền' : 'Vui lòng đăng nhập' }, { status });
  }
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  const routeId = searchParams.get('routeId');

  if (!dateStr || !routeId) {
    return NextResponse.json({ error: 'Missing date or routeId' }, { status: 400 });
  }

  try {
    const parsedDate = new Date(dateStr);
    const dayStart = new Date(new Date(dateStr).setHours(0, 0, 0, 0));
    const dayEnd   = new Date(new Date(dateStr).setHours(23, 59, 59, 999));

    // 1. Lấy tất cả schedule đang ACTIVE cho tuyến này
    const activeSchedules = await prisma.schedule.findMany({
      where: { routeId, active: true },
      orderBy: { departureTime: 'asc' }
    });

    if (activeSchedules.length === 0) {
      // Không còn giờ nào active → trả về rỗng (không xóa trip cũ, bảo toàn booking)
      return NextResponse.json({ trips: [] });
    }

    const activeScheduleIds = new Set(activeSchedules.map(s => s.id));

    // 2. Lấy tất cả trip hiện có trong ngày này
    let existingTrips = await prisma.trip.findMany({
      where: { routeId, travelDate: { gte: dayStart, lte: dayEnd } },
      include: {
        schedule: true,
        vehicle: true,
        route: true,
        bookings: { where: { status: { not: 'CANCELLED' } } }
      }
    });

    // 3. Chuẩn bị vehicles (lấy active)
    const allVehicles = await prisma.vehicle.findMany({ where: { status: 'ACTIVE' } });
    const fallbackVehicles = allVehicles.length > 0 ? allVehicles : await prisma.vehicle.findMany();
    if (fallbackVehicles.length === 0) {
      return NextResponse.json({ error: 'No vehicles available' }, { status: 500 });
    }

    // 4. Tạo trip cho schedule active CHƯA có trip trong ngày
    const existingScheduleIds = new Set(existingTrips.map(t => t.scheduleId));
    const schedulesNeedingTrip = activeSchedules.filter(s => !existingScheduleIds.has(s.id));

    if (schedulesNeedingTrip.length > 0) {
      const constrainedSchedules = await prisma.schedule.findMany({
        where: { active: true, vehicleType: { not: null } },
        select: { departureTime: true, vehicleType: true },
      });
      const reservedTypesByTime = new Map<string, Set<string>>();
      for (const schedule of constrainedSchedules) {
        if (!schedule.vehicleType) continue;
        const reserved = reservedTypesByTime.get(schedule.departureTime) ?? new Set<string>();
        reserved.add(schedule.vehicleType);
        reservedTypesByTime.set(schedule.departureTime, reserved);
      }

      let allDayTrips = await prisma.trip.findMany({
        where: { travelDate: { gte: dayStart, lte: dayEnd }, status: { not: 'CANCELLED' } },
        include: {
          schedule: { select: { departureTime: true, vehicleType: true } },
          vehicle: { select: { type: true } },
          bookings: { select: { id: true } },
        },
      });
      const occupiedByTime = new Map<string, Set<string>>();
      for (const trip of allDayTrips) {
        const occupied = occupiedByTime.get(trip.schedule.departureTime) ?? new Set<string>();
        occupied.add(trip.vehicleId);
        occupiedByTime.set(trip.schedule.departureTime, occupied);
      }

      // Repair flexible, unbooked trips that occupy a vehicle type reserved by another fixed schedule.
      for (const trip of allDayTrips) {
        if (trip.schedule.vehicleType || trip.bookings.length > 0) continue;
        const time = trip.schedule.departureTime;
        const reservedTypes = reservedTypesByTime.get(time) ?? new Set<string>();
        if (!reservedTypes.has(trip.vehicle.type)) continue;
        const occupied = occupiedByTime.get(time) ?? new Set<string>();
        const replacement = chooseAvailableVehicle(fallbackVehicles, occupied, null, reservedTypes);
        if (!replacement) continue;
        await prisma.trip.update({ where: { id: trip.id }, data: { vehicleId: replacement.id } });
        occupied.delete(trip.vehicleId);
        occupied.add(replacement.id);
      }

      // Re-read after repairs so creation uses the final assignments.
      allDayTrips = await prisma.trip.findMany({
        where: { travelDate: { gte: dayStart, lte: dayEnd }, status: { not: 'CANCELLED' } },
        include: {
          schedule: { select: { departureTime: true, vehicleType: true } },
          vehicle: { select: { type: true } },
          bookings: { select: { id: true } },
        },
      });
      occupiedByTime.clear();
      for (const trip of allDayTrips) {
        const occupied = occupiedByTime.get(trip.schedule.departureTime) ?? new Set<string>();
        occupied.add(trip.vehicleId);
        occupiedByTime.set(trip.schedule.departureTime, occupied);
      }
      const assignments: Array<{ scheduleId: string; vehicleId: string }> = [];
      for (const schedule of schedulesNeedingTrip) {
        const occupied = occupiedByTime.get(schedule.departureTime) ?? new Set<string>();
        const reservedTypes = reservedTypesByTime.get(schedule.departureTime) ?? new Set<string>();
        const vehicle = chooseAvailableVehicle(fallbackVehicles, occupied, schedule.vehicleType, reservedTypes);
        if (!vehicle) {
          return NextResponse.json({ error: `Không có xe ${schedule.vehicleType || ''} rảnh lúc ${schedule.departureTime}. Vui lòng điều chỉnh lịch hoặc bổ sung xe.`.replace('xe  rảnh', 'xe rảnh') }, { status: 409 });
        }
        assignments.push({ scheduleId: schedule.id, vehicleId: vehicle.id });
        occupied.add(vehicle.id);
        occupiedByTime.set(schedule.departureTime, occupied);
      }
      await prisma.$transaction(assignments.map((assignment) => prisma.trip.create({
        data: { routeId, scheduleId: assignment.scheduleId, vehicleId: assignment.vehicleId, travelDate: parsedDate, status: 'SCHEDULED' },
      })));

      // Re-fetch sau khi tạo thêm
      existingTrips = await prisma.trip.findMany({
        where: { routeId, travelDate: { gte: dayStart, lte: dayEnd } },
        include: {
          schedule: true,
          vehicle: true,
          route: true,
          bookings: { where: { status: { not: 'CANCELLED' } } }
        }
      });
    }

    // 5. CHỈ trả về trip có schedule đang ACTIVE
    //    (trip của schedule bị tắt bị ẩn, KHÔNG xóa để bảo toàn booking cũ)
    const activeTrips = existingTrips.filter(t => activeScheduleIds.has(t.scheduleId));

    // 6. Tính chỗ còn lại
    const tripsWithAvailability = activeTrips.map(trip => {
      const bookedSeatsList = trip.bookings
        .filter(b => b.seatNumbers)
        .flatMap(b => b.seatNumbers!.split(',').map(s => s.trim()));

      const bookedSeatsCount = trip.bookings.reduce((sum, b) => sum + b.passengerCount, 0);
      const capacity = trip.vehicle.seatCapacity;
      const available = capacity - bookedSeatsCount;

      return {
        id: trip.id,
        // Lấy giờ từ relation schedule → luôn phản ánh giờ mới nhất khi cập nhật
        time: trip.schedule.departureTime,
        status: trip.status,
        capacity,
        bookedSeats: bookedSeatsCount,
        available,
        isFull: available <= 0,
        vehicleType: trip.vehicle.type,
        vehicleName: trip.vehicle.name,
        plateNumber: trip.vehicle.plateNumber,
        basePrice: trip.route?.basePrice,
        bookedSeatsList
      };
    });

    // Sắp xếp theo giờ
    tripsWithAvailability.sort((a, b) => a.time.localeCompare(b.time));

    return NextResponse.json({ trips: tripsWithAvailability });
  } catch (error: any) {
    console.error('Trips API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
