"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, BusFront, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import TransferBookingModal from '../trips/[id]/TransferBookingModal';
import styles from './booking-actions.module.css';
import { canAcceptTripBookings } from '@/lib/business-rules';

export default function BookingActions({ booking }: { booking: any }) {
  const router = useRouter();
  const [transferring, setTransferring] = useState(false);
  const canTransfer = booking.status !== 'CANCELLED' && canAcceptTripBookings(booking.trip.travelDate, booking.trip.schedule.departureTime, booking.trip.status);
  const cancel = async () => {
    if (!confirm(`Hủy vé ${booking.bookingCode}? Ghế sẽ được trả lại ngay.`)) return;
    const cancelReason = prompt('Lý do hủy vé:', 'Khách thay đổi kế hoạch');
    if (cancelReason === null) return;
    const response = await fetch(`/api/bookings/${booking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELLED', cancelReason }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(data.error || 'Không thể hủy vé');
    toast.success('Đã hủy vé và trả lại ghế'); router.refresh();
  };
  return <>
    <div className={styles.actions}>
      {canTransfer && <button type="button" className={styles.transfer} onClick={() => setTransferring(true)}><ArrowLeftRight /> Đổi chuyến</button>}
      <Link href={`/trips/${booking.tripId}`}><BusFront /> Chi tiết</Link>
      {booking.status !== 'CANCELLED' && <button type="button" className={styles.cancel} onClick={cancel} title="Hủy vé"><XCircle /></button>}
    </div>
    {transferring && <TransferBookingModal booking={booking} trip={booking.trip} onClose={() => setTransferring(false)} onDone={() => { setTransferring(false); router.refresh(); }} />}
  </>;
}
