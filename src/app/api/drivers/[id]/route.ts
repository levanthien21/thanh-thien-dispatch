import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(['DISPATCHER', 'ADMIN']);
    const { id } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const update: { name?: string; phone?: string; licenseNumber?: string | null } = {};
    if (data.name !== undefined) { update.name = String(data.name).trim().slice(0, 100); if (update.name.length < 2) return NextResponse.json({ error: 'Tên không hợp lệ' }, { status: 400 }); }
    if (data.phone !== undefined) { update.phone = String(data.phone).replace(/\D/g, ''); if (!/^(?:0\d{9}|84\d{9})$/.test(update.phone)) return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 }); }
    if (data.licenseNumber !== undefined) update.licenseNumber = String(data.licenseNumber).trim().slice(0, 50) || null;
    const driver = await prisma.driver.update({
      where: { id },
      data: update
    });
    return NextResponse.json(driver);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(['DISPATCHER', 'ADMIN']);
    const { id } = await params;
    await prisma.driver.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
  }
}
