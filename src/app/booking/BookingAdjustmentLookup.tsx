"use client";

import { FormEvent, useState } from 'react';
import { ArrowLeftRight, Search, Ticket, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import TransferBookingModal from '../trips/[id]/TransferBookingModal';
import styles from './adjustment.module.css';
import { canAcceptTripBookings } from '@/lib/business-rules';

export default function BookingAdjustmentLookup() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 3) return toast.error('Nhập ít nhất 3 ký tự hoặc số điện thoại');
    setLoading(true);
    const response = await fetch(`/api/bookings/search?q=${encodeURIComponent(query.trim())}`);
    const data = await response.json().catch(() => ({})); setLoading(false);
    if (!response.ok) return toast.error(data.error || 'Không tìm được vé');
    setResults(Array.isArray(data.bookings) ? data.bookings : []);
  };
  if (!open) return <button type="button" className={styles.openButton} onClick={() => setOpen(true)}><ArrowLeftRight /><span><strong>Đổi chuyến đã đặt</strong><small>Tìm bằng SĐT hoặc mã vé</small></span></button>;
  return <section className={styles.panel}>
    <div className={styles.heading}><div><span><Ticket /></span><div><strong>Điều chỉnh vé đã đặt</strong><small>Tìm nhanh và chuyển sang giờ sớm hơn, trễ hơn hoặc ngày khác</small></div></div><button type="button" onClick={() => setOpen(false)}><X /></button></div>
    <form onSubmit={search}><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập mã vé, số điện thoại hoặc tên khách..." autoFocus /><button type="submit" disabled={loading}>{loading ? 'Đang tìm...' : 'Tìm vé'}</button></form>
    {results.length > 0 && <div className={styles.results}>{results.map((booking) => {
      const canTransfer = booking.status !== 'CANCELLED' && canAcceptTripBookings(booking.trip.travelDate, booking.trip.schedule.departureTime, booking.trip.status);
      return <article key={booking.id}><div><strong>{booking.bookingCode}</strong><span>{booking.customer.name} · {booking.customer.phone}</span></div><div><strong>{booking.trip.route.origin} → {booking.trip.route.destination}</strong><span>{new Date(booking.trip.travelDate).toLocaleDateString('vi-VN')} · {booking.trip.schedule.departureTime} · Ghế {booking.seatNumbers}</span></div><button type="button" disabled={!canTransfer} onClick={() => setSelected(booking)}><ArrowLeftRight />{booking.status === 'CANCELLED' ? 'Vé đã hủy' : canTransfer ? 'Đổi chuyến' : 'Chuyến đã chạy'}</button></article>;
    })}</div>}
    {!loading && query && results.length === 0 && <div className={styles.empty}>Chưa có kết quả. Nhập thông tin rồi nhấn “Tìm vé”.</div>}
    {selected && <TransferBookingModal booking={selected} trip={selected.trip} onClose={() => setSelected(null)} onDone={() => { setSelected(null); setResults((items) => items.filter((item) => item.id !== selected.id)); }} />}
  </section>;
}
