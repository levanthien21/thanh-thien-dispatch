import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const data = await request.json().catch(() => ({}));
    const current = await prisma.notification.findFirst({ where: { id, userId: user.id } });
    if (!current) return NextResponse.json({ error: 'Không tìm thấy thông báo' }, { status: 404 });
    await prisma.notification.update({ where: { id }, data: data.resolved ? { resolvedAt: new Date(), readAt: current.readAt || new Date() } : { readAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 }); }
}
