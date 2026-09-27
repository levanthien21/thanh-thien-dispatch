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
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim().slice(0, 100);
    if (data.plateNumber !== undefined) updateData.plateNumber = String(data.plateNumber).trim().toUpperCase().slice(0, 20);
    if (data.type !== undefined) updateData.type = String(data.type).trim().slice(0, 50);
    if (data.seatCapacity !== undefined) {
      const capacity = Number(data.seatCapacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 60) return NextResponse.json({ error: 'Sức chứa không hợp lệ' }, { status: 400 });
      updateData.seatCapacity = capacity;
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(vehicle);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(['DISPATCHER', 'ADMIN']);
    const { id } = await params;
    await prisma.vehicle.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
  }
}
