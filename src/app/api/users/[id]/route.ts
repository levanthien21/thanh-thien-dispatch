import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { hashPassword, requireUser, validatePassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser(['ADMIN']);
    const { id } = await params;
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const role = data.role === undefined ? current.role : String(data.role);
    const status = data.status === undefined ? current.status : String(data.status);
    if (!['AGENT', 'DISPATCHER', 'ADMIN'].includes(role) || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json({ error: 'Vai trò hoặc trạng thái không hợp lệ' }, { status: 400 });
    }
    if (actor.id === id && status !== 'ACTIVE') return NextResponse.json({ error: 'Không thể tự khóa tài khoản đang đăng nhập' }, { status: 409 });
    if (current.role === 'ADMIN' && current.status === 'ACTIVE' && (role !== 'ADMIN' || status !== 'ACTIVE')) {
      const admins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
      if (admins <= 1) return NextResponse.json({ error: 'Hệ thống phải còn ít nhất một quản trị viên hoạt động' }, { status: 409 });
    }
    const passwordHash = data.password ? await hashPassword(validatePassword(data.password)) : undefined;
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { role, status, passwordHash } });
      if (status === 'INACTIVE' || passwordHash) await tx.$executeRaw`DELETE FROM Session WHERE userId = ${id}`;
      await tx.auditLog.create({
        data: {
          userId: actor.id, action: 'USER_UPDATED', entityType: 'User', entityId: id,
          beforeData: JSON.stringify({ role: current.role, status: current.status }),
          afterData: JSON.stringify({ role, status, passwordReset: Boolean(passwordHash) }),
        },
      });
      return user;
    });
    return NextResponse.json({ user: { id: updated.id, role: updated.role, status: updated.status } });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'Dữ liệu tài khoản đã tồn tại' }, { status: 409 });
    const message = error instanceof Error ? error.message : 'Không thể cập nhật tài khoản';
    if (message === 'UNAUTHENTICATED' || message === 'FORBIDDEN') return NextResponse.json({ error: message === 'FORBIDDEN' ? 'Không đủ quyền' : 'Vui lòng đăng nhập' }, { status: message === 'FORBIDDEN' ? 403 : 401 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
