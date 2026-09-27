import { NextResponse } from 'next/server';
import type { PrismaClient } from '@prisma/client';
import {
  createSession,
  hashPassword,
  initializeFirstAdmin,
  needsInitialSetup,
  SetupConflictError,
  validatePassword,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  return NextResponse.json({ needsSetup: await needsInitialSetup() });
}

export async function POST(request: Request) {
  return handleSetup(request);
}

export async function handleSetup(
  request: Request,
  deps?: {
    db?: PrismaClient;
    createSession?: (userId: string) => Promise<void>;
  }
) {
  const db = deps?.db ?? prisma;
  const sessionFn = deps?.createSession ?? createSession;

  try {
    if (!(await needsInitialSetup(db))) {
      return NextResponse.json({ error: 'Hệ thống đã được khởi tạo' }, { status: 409 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const name = typeof data.name === 'string' ? data.name.trim().slice(0, 100) : '';
    const phone = typeof data.phone === 'string' ? data.phone.replace(/\D/g, '') : '';
    if (name.length < 2 || !/^(?:0\d{9}|84\d{9})$/.test(phone)) {
      return NextResponse.json({ error: 'Tên hoặc số điện thoại không hợp lệ' }, { status: 400 });
    }

    const passwordHash = await hashPassword(validatePassword(data.password));

    const result = await initializeFirstAdmin({ name, phone, passwordHash }, db);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    await sessionFn(result.userId);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SetupConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    const isInternalError =
      error instanceof Error &&
      (error.message.includes('Prisma') ||
        error.message.includes('sqlite') ||
        error.name.includes('Prisma'));

    const message =
      error instanceof Error && !isInternalError
        ? error.message
        : 'Không thể khởi tạo hệ thống';

    const status = isInternalError ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}


