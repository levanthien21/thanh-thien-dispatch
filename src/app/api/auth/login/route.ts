import { NextResponse } from 'next/server';
import { createSession, needsInitialSetup, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  if (await needsInitialSetup()) return NextResponse.json({ error: 'Hệ thống cần được khởi tạo', needsSetup: true }, { status: 409 });
  const body: unknown = await request.json();
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  const data = body as Record<string, unknown>;
  const phone = typeof data.phone === 'string' ? data.phone.replace(/\D/g, '') : '';
  const password = typeof data.password === 'string' ? data.password : '';
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || user.status !== 'ACTIVE' || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Số điện thoại hoặc mật khẩu không đúng' }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
}
