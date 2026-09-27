import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  return user ? NextResponse.json({ user }) : NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
}
