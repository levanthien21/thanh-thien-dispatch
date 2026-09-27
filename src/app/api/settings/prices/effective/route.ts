import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyPriceAdjustment, parseDateInput } from '@/lib/business-rules';

/**
 * GET /api/settings/prices/effective?routeId=xxx&date=YYYY-MM-DD
 * Trả về giá hiệu lực (đã áp dụng ngày lễ nếu có) cho ngày + tuyến cụ thể.
 * Response: { adultPrice, studentPrice, holidayApplied, holidayName, adjustSummary, baseAdult, baseStudent }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get('routeId');
    const dateStr = searchParams.get('date');
    const tripDate = dateStr ? parseDateInput(dateStr) : new Date();
    if (!tripDate) return NextResponse.json({ error: 'Ngày không hợp lệ' }, { status: 400 });

    // Helper: get base price for ticket type
    async function getBasePrice(ticketType: 'ADULT' | 'STUDENT'): Promise<number> {
      if (routeId) {
        const specific = await prisma.priceConfig.findFirst({ where: { ticketType, routeId } });
        if (specific) return specific.basePrice;
      }
      const global = await prisma.priceConfig.findFirst({ where: { ticketType, routeId: null } });
      if (global) return global.basePrice;
      return ticketType === 'STUDENT' ? 120000 : 130000;
    }

    const baseAdult = await getBasePrice('ADULT');
    const baseStudent = await getBasePrice('STUDENT');

    // Find active holiday for this date + route
    const holidays = await prisma.holidayPrice.findMany({
      where: {
        active: true,
        startDate: { lte: tripDate },
        endDate: { gte: tripDate },
        OR: [{ routeId: null }, { routeId: routeId || undefined }],
      },
      orderBy: { createdAt: 'desc' },
    });
    const holiday = holidays.find((item) => item.routeId === routeId) ?? holidays.find((item) => item.routeId === null) ?? null;

    function applyAdjust(base: number, h: typeof holiday): number {
      if (!h) return base;
      return applyPriceAdjustment(base, h.adjustType, h.adjustValue, h.adjustMode);
    }

    const adultPrice = Math.round(applyAdjust(baseAdult, holiday));
    const studentPrice = Math.round(applyAdjust(baseStudent, holiday));

    let adjustSummary = '';
    if (holiday) {
      const sign = holiday.adjustMode === 'INCREASE' ? '+' : '-';
      const val = holiday.adjustType === 'PERCENTAGE'
        ? `${holiday.adjustValue}%`
        : new Intl.NumberFormat('vi-VN').format(holiday.adjustValue) + 'đ';
      adjustSummary = `${sign}${val}`;
    }

    return NextResponse.json({
      adultPrice,
      studentPrice,
      baseAdult,
      baseStudent,
      holidayApplied: !!holiday,
      holidayName: holiday?.name || null,
      adjustSummary,
      adjustMode: holiday?.adjustMode || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
