import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { parseDateInput, validMoney } from '@/lib/business-rules';
import { prisma } from '@/lib/prisma';

async function holidayInput(request: Request) {
  const body: unknown = await request.json();
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name.trim().slice(0, 100) : '';
  const startDate = parseDateInput(data.startDate);
  const endDate = parseDateInput(data.endDate, true);
  const adjustType = String(data.adjustType);
  const adjustMode = String(data.adjustMode);
  const adjustValue = validMoney(data.adjustValue, adjustType === 'PERCENTAGE' ? 500 : 100_000_000);
  if (name.length < 2 || !startDate || !endDate || endDate < startDate || !['PERCENTAGE', 'FIXED'].includes(adjustType) || !['INCREASE', 'DECREASE'].includes(adjustMode) || adjustValue === null) return null;
  return { id: typeof data.id === 'string' ? data.id : '', name, startDate, endDate, adjustType, adjustMode, adjustValue, routeId: typeof data.routeId === 'string' && data.routeId ? data.routeId : null, active: data.active === undefined ? true : data.active === true };
}

export async function GET() {
  await requireUser(['ADMIN']);
  const holidays = await prisma.holidayPrice.findMany({ orderBy: { startDate: 'asc' }, include: { route: { select: { id: true, origin: true, destination: true } } } });
  return NextResponse.json({ holidays });
}

export async function POST(request: Request) {
  return save(request, false);
}

export async function PUT(request: Request) {
  return save(request, true);
}

async function save(request: Request, updating: boolean) {
  try {
    const actor = await requireUser(['ADMIN']);
    const data = await holidayInput(request);
    if (!data || (updating && !data.id)) return NextResponse.json({ error: 'Thông tin ngày lễ không hợp lệ' }, { status: 400 });
    if (data.routeId && !(await prisma.route.findUnique({ where: { id: data.routeId } }))) return NextResponse.json({ error: 'Tuyến xe không tồn tại' }, { status: 404 });
    const before = updating ? await prisma.holidayPrice.findUnique({ where: { id: data.id } }) : null;
    if (updating && !before) return NextResponse.json({ error: 'Không tìm thấy cấu hình ngày lễ' }, { status: 404 });
    if (data.active) {
      const overlap = await prisma.holidayPrice.findFirst({
        where: {
          id: updating ? { not: data.id } : undefined,
          active: true,
          routeId: data.routeId,
          startDate: { lte: data.endDate },
          endDate: { gte: data.startDate },
        },
      });
      if (overlap) return NextResponse.json({ error: `Khoảng ngày bị trùng với cấu hình “${overlap.name}”` }, { status: 409 });
    }
    const values = { name: data.name, startDate: data.startDate, endDate: data.endDate, adjustType: data.adjustType, adjustMode: data.adjustMode, adjustValue: data.adjustValue, routeId: data.routeId, active: data.active };
    const holiday = await prisma.$transaction(async (tx) => {
      const saved = updating
        ? await tx.holidayPrice.update({ where: { id: data.id }, data: values, include: { route: { select: { id: true, origin: true, destination: true } } } })
        : await tx.holidayPrice.create({ data: values, include: { route: { select: { id: true, origin: true, destination: true } } } });
      await tx.auditLog.create({ data: { userId: actor.id, action: updating ? 'HOLIDAY_UPDATED' : 'HOLIDAY_CREATED', entityType: 'HolidayPrice', entityId: saved.id, beforeData: before ? JSON.stringify(before) : null, afterData: JSON.stringify(values) } });
      return saved;
    });
    return NextResponse.json({ holiday }, { status: updating ? 200 : 201 });
  } catch (error: unknown) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireUser(['ADMIN']);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    const before = await prisma.holidayPrice.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'Không tìm thấy cấu hình ngày lễ' }, { status: 404 });
    await prisma.$transaction(async (tx) => { await tx.holidayPrice.delete({ where: { id } }); await tx.auditLog.create({ data: { userId: actor.id, action: 'HOLIDAY_DELETED', entityType: 'HolidayPrice', entityId: id, beforeData: JSON.stringify(before) } }); });
    return NextResponse.json({ success: true });
  } catch (error: unknown) { return failure(error); }
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'UNAUTHENTICATED' || message === 'FORBIDDEN') return NextResponse.json({ error: message === 'FORBIDDEN' ? 'Không đủ quyền' : 'Vui lòng đăng nhập' }, { status: message === 'FORBIDDEN' ? 403 : 401 });
  return NextResponse.json({ error: 'Không thể cập nhật ngày lễ' }, { status: 500 });
}
