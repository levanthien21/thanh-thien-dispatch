import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { validMoney } from '@/lib/business-rules';
import { prisma } from '@/lib/prisma';

async function priceInput(request: Request) {
  const body: unknown = await request.json();
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name.trim().slice(0, 100) : '';
  const ticketType = String(data.ticketType);
  const routeId = typeof data.routeId === 'string' && data.routeId ? data.routeId : null;
  const basePrice = validMoney(data.basePrice, 100_000_000);
  return name.length >= 2 && ['ADULT', 'STUDENT'].includes(ticketType) && basePrice !== null
    ? { id: typeof data.id === 'string' ? data.id : '', name, ticketType, routeId, basePrice }
    : null;
}

export async function GET() {
  await requireUser(['ADMIN']);
  const prices = await prisma.priceConfig.findMany({ orderBy: { createdAt: 'asc' }, include: { route: { select: { id: true, origin: true, destination: true } } } });
  return NextResponse.json({ prices });
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser(['ADMIN']);
    const data = await priceInput(request);
    if (!data) return NextResponse.json({ error: 'Thông tin giá vé không hợp lệ' }, { status: 400 });
    if (data.routeId && !(await prisma.route.findUnique({ where: { id: data.routeId } }))) return NextResponse.json({ error: 'Tuyến xe không tồn tại' }, { status: 404 });
    const duplicate = await prisma.priceConfig.findFirst({ where: { ticketType: data.ticketType, routeId: data.routeId } });
    if (duplicate) return NextResponse.json({ error: 'Loại vé này đã có giá cho phạm vi đã chọn' }, { status: 409 });
    const price = await prisma.$transaction(async (tx) => {
      const created = await tx.priceConfig.create({ data: { name: data.name, ticketType: data.ticketType, routeId: data.routeId, basePrice: data.basePrice }, include: { route: { select: { id: true, origin: true, destination: true } } } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'PRICE_CREATED', entityType: 'PriceConfig', entityId: created.id, afterData: JSON.stringify(data) } });
      return created;
    });
    return NextResponse.json({ price }, { status: 201 });
  } catch (error: unknown) { return authError(error); }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireUser(['ADMIN']);
    const data = await priceInput(request);
    if (!data?.id) return NextResponse.json({ error: 'Thông tin giá vé không hợp lệ' }, { status: 400 });
    const before = await prisma.priceConfig.findUnique({ where: { id: data.id } });
    if (!before) return NextResponse.json({ error: 'Không tìm thấy cấu hình giá' }, { status: 404 });
    const duplicate = await prisma.priceConfig.findFirst({ where: { ticketType: data.ticketType, routeId: data.routeId, id: { not: data.id } } });
    if (duplicate) return NextResponse.json({ error: 'Loại vé này đã có giá cho phạm vi đã chọn' }, { status: 409 });
    const price = await prisma.$transaction(async (tx) => {
      const updated = await tx.priceConfig.update({ where: { id: data.id }, data: { name: data.name, ticketType: data.ticketType, routeId: data.routeId, basePrice: data.basePrice }, include: { route: { select: { id: true, origin: true, destination: true } } } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'PRICE_UPDATED', entityType: 'PriceConfig', entityId: data.id, beforeData: JSON.stringify(before), afterData: JSON.stringify(data) } });
      return updated;
    });
    return NextResponse.json({ price });
  } catch (error: unknown) { return authError(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireUser(['ADMIN']);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    const before = await prisma.priceConfig.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'Không tìm thấy cấu hình giá' }, { status: 404 });
    await prisma.$transaction(async (tx) => { await tx.priceConfig.delete({ where: { id } }); await tx.auditLog.create({ data: { userId: actor.id, action: 'PRICE_DELETED', entityType: 'PriceConfig', entityId: id, beforeData: JSON.stringify(before) } }); });
    return NextResponse.json({ success: true });
  } catch (error: unknown) { return authError(error); }
}

function authError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Không thể cập nhật giá';
  if (message === 'UNAUTHENTICATED' || message === 'FORBIDDEN') return NextResponse.json({ error: message === 'FORBIDDEN' ? 'Không đủ quyền' : 'Vui lòng đăng nhập' }, { status: message === 'FORBIDDEN' ? 403 : 401 });
  return NextResponse.json({ error: 'Không thể cập nhật giá' }, { status: 500 });
}
