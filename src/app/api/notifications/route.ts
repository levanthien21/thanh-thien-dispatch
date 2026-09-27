import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncOperationalNotifications } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    await syncOperationalNotifications(user);
    const params = new URL(request.url).searchParams;
    const take = Math.min(100, Math.max(1, Number(params.get('take')) || 20));
    const unreadOnly = params.get('unread') === '1';
    const type = params.get('type');
    const notifications = await prisma.notification.findMany({ where: { userId: user.id, resolvedAt: null, ...(unreadOnly ? { readAt: null } : {}), ...(type && type !== 'ALL' ? { type } : {}) }, orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }], take });
    const unreadCount = await prisma.notification.count({ where: { userId: user.id, readAt: null, resolvedAt: null } });
    return NextResponse.json({ notifications, unreadCount });
  } catch { return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 }); }
}

export async function PATCH() {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 }); }
}
