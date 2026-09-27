import { prisma } from '@/lib/prisma';
import type { AuthUser } from '@/lib/auth';

export async function syncOperationalNotifications(user: AuthUser) {
  const alerts: Array<{ dedupeKey: string; type: string; title: string; message: string; priority: string; link: string }> = [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000);

  if (user.role === 'ADMIN' || user.role === 'DISPATCHER') {
    const trips = await prisma.trip.findMany({ where: { travelDate: { gte: start, lt: end }, status: 'SCHEDULED', driverId: null }, include: { route: true, schedule: true }, take: 20 });
    for (const trip of trips) alerts.push({ dedupeKey: `TRIP_NO_DRIVER:${trip.id}`, type: 'TRIP', title: 'Chuyến chưa có tài xế', message: `${trip.route.origin} → ${trip.route.destination} lúc ${trip.schedule.departureTime}`, priority: 'HIGH', link: `/trips/${trip.id}` });
  }
  const unpaid = await prisma.booking.findMany({ where: { createdBy: user.id, paymentStatus: { not: 'PAID' }, status: { not: 'CANCELLED' }, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } }, include: { customer: true }, orderBy: { createdAt: 'desc' }, take: 15 });
  for (const booking of unpaid) alerts.push({ dedupeKey: `BOOKING_UNPAID:${booking.id}`, type: 'PAYMENT', title: 'Vé chưa thanh toán', message: `${booking.bookingCode} · ${booking.customer.name}`, priority: 'NORMAL', link: `/search?q=${encodeURIComponent(booking.bookingCode)}` });

  if (user.role === 'ADMIN') {
    const failed = await prisma.smsLog.findMany({ where: { status: 'FAILED', createdAt: { gte: new Date(Date.now() - 7 * 86400000) } }, take: 10 });
    for (const sms of failed) alerts.push({ dedupeKey: `SMS_FAILED:${sms.id}`, type: 'MESSAGE', title: 'Gửi tin nhắn thất bại', message: `Không gửi được thông báo đến ${sms.phone}`, priority: 'HIGH', link: '/settings/sms' });
  }
  await Promise.all(alerts.map((alert) => prisma.notification.upsert({ where: { userId_dedupeKey: { userId: user.id, dedupeKey: alert.dedupeKey } }, update: { title: alert.title, message: alert.message, priority: alert.priority, link: alert.link }, create: { ...alert, userId: user.id } })));
}
