import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { TIME_PATTERN } from '@/lib/business-rules';

export const dynamic = 'force-dynamic';

// GET – danh sách Schedules kèm thông tin tuyến
export async function GET(req: Request) {
  try {
    await requireUser(['ADMIN']);
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get('routeId');
    const where = routeId ? { routeId } : {};
    const schedules = await prisma.schedule.findMany({
      where,
      orderBy: [{ routeId: 'asc' }, { departureTime: 'asc' }],
      include: { 
        route: { select: { id: true, origin: true, destination: true } },
        driver: { select: { id: true, name: true, phone: true } }
      },
    });
    const routes = await prisma.route.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { origin: 'asc' },
      select: { id: true, origin: true, destination: true },
    });
    
    // Get distinct vehicle types
    const vehicles = await prisma.vehicle.findMany({ select: { type: true } });
    const vehicleTypes = Array.from(new Set(vehicles.map(v => v.type)));

    // Get drivers
    const drivers = await prisma.driver.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, phone: true } });

    return NextResponse.json({ schedules, routes, vehicleTypes, drivers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST – tạo mới giờ chạy
export async function POST(req: Request) {
  try {
    await requireUser(['ADMIN']);
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const input = body as Record<string, unknown>;
    const routeId = typeof input.routeId === 'string' ? input.routeId : '';
    const departureTime = typeof input.departureTime === 'string' ? input.departureTime : '';
    const active = input.active;
    const vehicleType = typeof input.vehicleType === 'string' ? input.vehicleType.trim().slice(0, 50) : '';
    const driverId = typeof input.driverId === 'string' ? input.driverId : '';
    if (!routeId || !departureTime) {
      return NextResponse.json({ error: 'Thiếu routeId hoặc departureTime' }, { status: 400 });
    }
    // Validate HH:mm format
    if (!TIME_PATTERN.test(departureTime)) {
      return NextResponse.json({ error: 'Định dạng giờ không hợp lệ (HH:mm)' }, { status: 400 });
    }
    // Check duplicate
    const existing = await prisma.schedule.findFirst({ where: { routeId, departureTime } });
    if (existing) {
      return NextResponse.json({ error: `Giờ ${departureTime} đã tồn tại cho tuyến này` }, { status: 409 });
    }
    const schedule = await prisma.schedule.create({
      data: {
        routeId,
        departureTime,
        active: active !== undefined ? Boolean(active) : true,
        vehicleType: vehicleType || null,
        driverId: driverId || null,
      },
      include: { 
        route: { select: { id: true, origin: true, destination: true } },
        driver: { select: { id: true, name: true, phone: true } }
      },
    });
    revalidatePath('/');
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT – cập nhật (bật/tắt hoặc đổi giờ)
export async function PUT(req: Request) {
  try {
    await requireUser(['ADMIN']);
    const body = await req.json();
    const { id, departureTime, active, vehicleType, driverId } = body;
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    const updateData: any = {};
    if (departureTime !== undefined) {
      if (!TIME_PATTERN.test(departureTime)) {
        return NextResponse.json({ error: 'Định dạng giờ không hợp lệ (HH:mm)' }, { status: 400 });
      }
      updateData.departureTime = departureTime;
    }
    if (active !== undefined) updateData.active = Boolean(active);
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType || null;
    if (driverId !== undefined) updateData.driverId = driverId || null;
    const schedule = await prisma.schedule.update({
      where: { id },
      data: updateData,
      include: { 
        route: { select: { id: true, origin: true, destination: true } },
        driver: { select: { id: true, name: true, phone: true } }
      },
    });

    // Sau khi cập nhật giờ chạy, cập nhật lại xe và tài xế cho các chuyến trống của ngày hôm nay và tương lai
    if (vehicleType !== undefined || driverId !== undefined) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const emptyTrips = await prisma.trip.findMany({
        where: {
          scheduleId: id,
          travelDate: { gte: today },
          bookings: { none: {} }, // Chỉ đổi xe nếu chưa có ai đặt
        }
      });

      if (emptyTrips.length > 0) {
        const allVehicles = await prisma.vehicle.findMany({ where: { status: 'ACTIVE' } });
        const fallbackVehicles = allVehicles.length > 0 ? allVehicles : await prisma.vehicle.findMany();
        let availableVehicles = fallbackVehicles;
        if (availableVehicles.length === 0) return NextResponse.json({ error: 'Chưa có phương tiện để gán cho chuyến' }, { status: 409 });
        if (updateData.vehicleType) {
          const filtered = fallbackVehicles.filter(v => v.type === updateData.vehicleType);
          if (filtered.length > 0) availableVehicles = filtered;
        }

        for (let i = 0; i < emptyTrips.length; i++) {
          const trip = emptyTrips[i];
          const vehicle = availableVehicles[i % availableVehicles.length];
          const tripUpdateData: any = {};
          if (vehicleType !== undefined) tripUpdateData.vehicleId = vehicle.id;
          if (driverId !== undefined) tripUpdateData.driverId = updateData.driverId;
          
          if (Object.keys(tripUpdateData).length > 0) {
            await prisma.trip.update({
              where: { id: trip.id },
              data: tripUpdateData
            });
          }
        }
      }
    }

    revalidatePath('/'); // Xóa cache trang chủ Dashboard
    revalidatePath('/settings/schedules'); // Xóa cache trang cài đặt
    
    return NextResponse.json({ schedule });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE – xóa giờ chạy
export async function DELETE(req: Request) {
  try {
    await requireUser(['ADMIN']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    
    // Check if there are any bookings for this schedule's trips
    const tripsWithBookings = await prisma.trip.count({
      where: {
        scheduleId: id,
        bookings: { some: {} }
      }
    });

    if (tripsWithBookings > 0) {
      return NextResponse.json({ 
        error: "Không thể xóa vì đã có khách đặt vé trên các chuyến của giờ này. Vui lòng tắt (vô hiệu hóa) thay vì xóa." 
      }, { status: 409 });
    }

    // Nếu không có khách đặt vé, ta có thể an toàn xóa các chuyến đi rỗng trước, sau đó xóa giờ
    await prisma.trip.deleteMany({
      where: { scheduleId: id }
    });

    await prisma.schedule.delete({ where: { id } });
    revalidatePath('/');
    revalidatePath('/settings/schedules');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
