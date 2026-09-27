import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { hashPassword, requireUser, validatePassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ROLES = ['AGENT', 'DISPATCHER', 'ADMIN'];

export async function GET() {
  try {
    await requireUser(['ADMIN']);
    const users = await prisma.user.findMany({
      select: { id: true, name: true, phone: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ users });
  } catch (error: unknown) {
    const status = error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? 'Không đủ quyền' : 'Vui lòng đăng nhập' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser(['ADMIN']);
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const name = typeof data.name === 'string' ? data.name.trim().slice(0, 100) : '';
    const phone = typeof data.phone === 'string' ? data.phone.replace(/\D/g, '') : '';
    const email = typeof data.email === 'string' && data.email.trim() ? data.email.trim().toLowerCase().slice(0, 200) : null;
    const role = String(data.role);
    if (name.length < 2 || !/^(?:0\d{9}|84\d{9})$/.test(phone) || !ROLES.includes(role)) {
      return NextResponse.json({ error: 'Tên, số điện thoại hoặc vai trò không hợp lệ' }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    const passwordHash = await hashPassword(validatePassword(data.password));
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { name, phone, email, role, passwordHash } });
      await tx.auditLog.create({
        data: { userId: actor.id, action: 'USER_CREATED', entityType: 'User', entityId: created.id, afterData: JSON.stringify({ name, phone, email, role }) },
      });
      return created;
    });
    return NextResponse.json({ user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, status: user.status } }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'Số điện thoại hoặc email đã tồn tại' }, { status: 409 });
    const message = error instanceof Error ? error.message : 'Không thể tạo tài khoản';
    if (message === 'UNAUTHENTICATED' || message === 'FORBIDDEN') return NextResponse.json({ error: message === 'FORBIDDEN' ? 'Không đủ quyền' : 'Vui lòng đăng nhập' }, { status: message === 'FORBIDDEN' ? 403 : 401 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
