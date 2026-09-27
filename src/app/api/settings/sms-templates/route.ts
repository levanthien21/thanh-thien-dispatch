import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET() {
  try {
    await requireUser(['ADMIN']);
    const templates = await prisma.smsTemplate.findMany();
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireUser(['ADMIN']);
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const id = typeof data.id === 'string' ? data.id : '';
    const content = typeof data.content === 'string' ? data.content.trim() : '';
    const isActive = data.isActive === true;
    
    if (!id || !content || content.length > 2000) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const before = await prisma.smsTemplate.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'Không tìm thấy mẫu tin' }, { status: 404 });
    const template = await prisma.$transaction(async (tx) => {
      const updated = await tx.smsTemplate.update({ where: { id }, data: { content, isActive } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'SMS_TEMPLATE_UPDATED', entityType: 'SmsTemplate', entityId: id, beforeData: JSON.stringify({ content: before.content, isActive: before.isActive }), afterData: JSON.stringify({ content, isActive }) } });
      return updated;
    });
    
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}
