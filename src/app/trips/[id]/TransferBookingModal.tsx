"use client";

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SeatMap from '../../booking/SeatMap';
import styles from './transfer.module.css';

type Candidate = { id: string; time: string; available: number; vehicleType: string; vehicleName: string; plateNumber: string; bookedSeatsList: string[]; status: string; isFull?: boolean };

const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

const initialTransferDate = (travelDate: string | Date) => {
  const today = localDate(new Date());
  const current = localDate(new Date(travelDate));
  return current > today ? current : today;
};

export default function TransferBookingModal({ booking, trip, onClose, onDone }: { booking: any; trip: any; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(initialTransferDate(trip.travelDate));
  const [trips, setTrips] = useState<Candidate[]>([]);
  const [targetId, setTargetId] = useState('');
  const [seats, setSeats] = useState<string[]>([]);
  const [reason, setReason] = useState('Khách yêu cầu đổi ngày/giờ đi');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const target = useMemo(() => trips.find((item) => item.id === targetId), [trips, targetId]);

  useEffect(() => {
    setLoading(true); setTargetId(''); setSeats([]);
    fetch(`/api/trips?date=${date}&routeId=${trip.routeId}`, { method: 'POST' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không tải được chuyến');
        setTrips(Array.isArray(data.trips) ? data.trips : []);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [date, trip.id, trip.routeId, booking.passengerCount]);

  const submit = async () => {
    if (!target) return toast.error('Vui lòng chọn chuyến mới');
    if (seats.length !== booking.passengerCount) return toast.error(`Vui lòng chọn đúng ${booking.passengerCount} ghế`);
    if (!reason.trim()) return toast.error('Vui lòng nhập lý do chuyển vé');
    setSaving(true);
    const response = await fetch(`/api/bookings/${booking.id}/transfer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetTripId: target.id, seatNumbers: seats, reason }) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) return toast.error(data.error || 'Không thể chuyển chuyến');
    toast.success(`Đã chuyển vé ${booking.bookingCode} sang ${date} lúc ${target.time}`);
    onDone();
  };

  return <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Chuyển giờ vé">
    <div className={styles.modal}>
      <header><div><span>CHUYỂN VÉ</span><h2>Chọn lại ngày và giờ đi</h2><p>Vé {booking.bookingCode} · {booking.customer.name} · {booking.passengerCount} khách · Ghế hiện tại {booking.seatNumbers}</p></div><button type="button" onClick={onClose} aria-label="Đóng"><X /></button></header>
      <div className={styles.routeLine}><div><small>Chuyến hiện tại</small><strong>{new Date(trip.travelDate).toLocaleDateString('vi-VN')} · {trip.schedule.departureTime}</strong></div><ArrowRight /><div><small>Chuyến mới</small><strong>{target ? `${new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN')} · ${target.time}` : 'Chưa chọn'}</strong></div></div>
      <div className={styles.body}>
        <section className={styles.selector}>
          <label><CalendarDays /> Ngày muốn đi<input type="date" min={localDate(new Date())} value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <div className={styles.tripList}><h3><Clock3 /> Các chuyến trong ngày <small>{trips.length} chuyến</small></h3>{loading ? <p>Đang kiểm tra chỗ trống...</p> : trips.length ? trips.map((item) => {
            const departure = new Date(`${date}T${item.time}:00`);
            const currentDeparture = new Date(trip.travelDate);
            const [currentHour, currentMinute] = trip.schedule.departureTime.split(':').map(Number);
            currentDeparture.setHours(currentHour, currentMinute, 0, 0);
            const isCurrent = item.id === trip.id;
            const isPast = departure <= new Date();
            const unavailable = isCurrent || isPast || item.available < booking.passengerCount || ['CANCELLED', 'COMPLETED'].includes(item.status);
            const direction = departure < currentDeparture ? 'Sớm hơn' : departure > currentDeparture ? 'Trễ hơn' : 'Hiện tại';
            return <button key={item.id} type="button" disabled={unavailable} className={`${targetId === item.id ? styles.selectedTrip : ''} ${unavailable ? styles.unavailableTrip : ''}`} onClick={() => { setTargetId(item.id); setSeats([]); }}><strong>{item.time}</strong><span>{item.vehicleName} · {item.plateNumber}<small>{direction}</small></span><em>{isCurrent ? 'Chuyến đang đặt' : isPast ? 'Đã khởi hành' : item.available < booking.passengerCount ? 'Không đủ ghế' : `Còn ${item.available} ghế`}</em></button>;
          }) : <p>Không có lịch chạy trong ngày này.</p>}</div>
          <label>Lý do chuyển vé<textarea required value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Ví dụ: Khách không kịp giờ" /></label>
        </section>
        <section className={styles.seatArea}>{target ? <SeatMap vehicleType={target.vehicleType} bookedSeatsList={target.bookedSeatsList || []} selectedSeats={seats} onToggleSeat={(seat) => setSeats((current) => current.includes(seat) ? current.filter((item) => item !== seat) : current.length < booking.passengerCount ? [...current, seat] : current)} /> : <div className={styles.noSeat}><Clock3 /><strong>Chọn giờ để xem sơ đồ ghế</strong><span>Hệ thống sẽ kiểm tra ghế trống theo chuyến mới.</span></div>}</section>
      </div>
      <footer><div><strong>{seats.length}/{booking.passengerCount} ghế mới</strong><span>Mã vé và trạng thái thanh toán được giữ nguyên</span></div><button type="button" className={styles.secondary} onClick={onClose}>Đóng</button><button type="button" className={styles.primary} onClick={submit} disabled={saving || !target || seats.length !== booking.passengerCount || !reason.trim()}>{saving ? 'Đang chuyển...' : 'Xác nhận chuyển vé'}</button></footer>
    </div>
  </div>;
}
