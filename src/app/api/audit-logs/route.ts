import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requireUser(['ADMIN']);
    const { searchParams } = new URL(request.url);
    const take = Math.min(200, Math.max(1, Number(searchParams.get('take')) || 100));
    const logs = await prisma.auditLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, phone: true, role: true } } },
    });
    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const status = error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? 'Không đủ quyền' : 'Vui lòng đăng nhập' }, { status });
  }
}
