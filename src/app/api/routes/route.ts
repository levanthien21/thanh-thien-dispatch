import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const routes = await prisma.route.findMany();
    return NextResponse.json({ routes });
  } catch (error) {
    console.error("API /routes Error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
