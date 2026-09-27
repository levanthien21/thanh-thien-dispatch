import { NextResponse } from 'next/server';
import { hashPassword, requireUser, validatePassword, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const currentPassword = typeof data.currentPassword === 'string' ? data.currentPassword : '';
    const newPassword = validatePassword(data.newPassword);
    if (currentPassword === newPassword) return NextResponse.json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: actor.id } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 401 });
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: actor.id }, data: { passwordHash } });
      await tx.$executeRaw`DELETE FROM Session WHERE userId = ${actor.id}`;
      await tx.auditLog.create({ data: { userId: actor.id, action: 'PASSWORD_CHANGED', entityType: 'User', entityId: actor.id } });
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Không thể đổi mật khẩu';
    return NextResponse.json({ error: message === 'UNAUTHENTICATED' ? 'Vui lòng đăng nhập' : message }, { status: message === 'UNAUTHENTICATED' ? 401 : 400 });
  }
}
