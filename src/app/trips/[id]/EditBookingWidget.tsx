"use client";

import { useEffect, useState } from 'react';
import { Banknote, MapPin, NotebookPen, Ticket, UserRound, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import styles from './edit-booking.module.css';
import { validSeatNumbers } from '@/lib/seat-layout';
import { canAcceptTripBookings } from '@/lib/business-rules';

export default function EditBookingWidget({ booking, trip, onClose, onDone }: { booking: any; trip: any; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ status: booking.status, pickupLocation: booking.pickupLocation || '', dropoffLocation: booking.dropoffLocation || '', paymentStatus: booking.paymentStatus, paymentMethod: booking.paymentMethod, notes: booking.notes || '' });
  const [seats, setSeats] = useState<string[]>(booking.seatNumbers?.split(',').filter(Boolean) || []);
  const initialAdult = Number(booking.ticketType?.match(/ADULT:(\d+)/)?.[1] ?? (booking.ticketType === 'STUDENT' ? 0 : booking.passengerCount));
  const initialStudent = Number(booking.ticketType?.match(/STUDENT:(\d+)/)?.[1] ?? (booking.ticketType === 'STUDENT' ? booking.passengerCount : 0));
  const [adultCount, setAdultCount] = useState(initialAdult);
  const [studentCount, setStudentCount] = useState(initialStudent);
  const seatEditingAllowed = canAcceptTripBookings(trip.travelDate, trip.schedule.departureTime, trip.status);
  const occupiedByOthers = trip.bookings.filter((item: any) => item.id !== booking.id && item.status !== 'CANCELLED').flatMap((item: any) => item.seatNumbers?.split(',').filter(Boolean) || []);
  const allSeats = validSeatNumbers(trip.vehicle.type);
  useEffect(() => {
    if (form.paymentStatus === 'PAID' && form.paymentMethod !== 'TRANSFER') setForm((value) => ({ ...value, paymentMethod: 'TRANSFER' }));
    if (form.paymentStatus === 'UNPAID' && form.paymentMethod !== 'CASH') setForm((value) => ({ ...value, paymentMethod: 'CASH' }));
  }, [form.paymentStatus, form.paymentMethod]);
  const save = async () => {
    if (!form.pickupLocation.trim() || !form.dropoffLocation.trim()) return toast.error('Vui lòng nhập đủ điểm đón và điểm trả');
    setSaving(true);
    if (!seats.length) return toast.error('Vé phải còn ít nhất một ghế; nếu hủy toàn bộ hãy dùng chức năng Hủy vé');
    if (adultCount + studentCount !== seats.length) return toast.error('Số loại vé phải khớp với số ghế đã chọn');
    const payload = seatEditingAllowed ? { ...form, passengerCount: seats.length, seatNumbers: seats.join(','), ticketType: `ADULT:${adultCount},STUDENT:${studentCount}` } : form;
    const response = await fetch(`/api/bookings/${booking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({})); setSaving(false);
    if (!response.ok) return toast.error(data.error || 'Không thể cập nhật vé');
    toast.success(data.refundDue > 0 ? `Đã cập nhật vé · Cần hoàn khách ${new Intl.NumberFormat('vi-VN').format(data.refundDue)} đ` : `Đã cập nhật vé ${booking.bookingCode}`); onDone();
  };
  return <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Sửa thông tin vé">
    <section className={styles.widget}>
      <header><div className={styles.ticketIcon}><Ticket /></div><div><span>CHỈNH SỬA VÉ</span><h2>{booking.bookingCode}</h2><p><UserRound /> {booking.customer.name} · {booking.customer.phone}</p></div><button className={styles.closeButton} type="button" onClick={onClose} aria-label="Đóng"><X /></button></header>
      <div className={styles.summary}><span><small>Ghế đang chọn</small><strong>{seats.join(', ')}</strong></span><span><small>Số khách</small><strong>{seats.length}</strong></span><span><small>Giá trị hiện tại</small><strong>{new Intl.NumberFormat('vi-VN').format(booking.total)} đ</strong></span></div>
      <div className={styles.body}>
        <section><h3><Ticket /> Điều chỉnh ghế <small>{seats.length} ghế đang chọn</small></h3><div className={styles.seatPicker}>{allSeats.map((seat) => { const occupied = occupiedByOthers.includes(seat); const selected = seats.includes(seat); return <button key={seat} type="button" disabled={!seatEditingAllowed || occupied} className={selected ? styles.seatSelected : occupied ? styles.seatOccupied : ''} onClick={() => { const next = selected ? seats.filter((item) => item !== seat) : [...seats, seat]; setSeats(next); const total = next.length; if (adultCount + studentCount > total) { const nextStudent = Math.min(studentCount, total); setStudentCount(nextStudent); setAdultCount(total - nextStudent); } else if (adultCount + studentCount < total) setAdultCount((value) => value + 1); }}>{seat}<small>{occupied ? 'Đã đặt' : selected ? 'Đang chọn' : 'Còn trống'}</small></button>; })}</div>{!seatEditingAllowed && <p className={styles.lockedNote}>Chuyến đã khởi hành nên không thể thêm hoặc xóa ghế.</p>}<div className={styles.ticketCounts}><label>Người lớn <span><button type="button" onClick={() => adultCount > 0 && setAdultCount(adultCount - 1)}>−</button><strong>{adultCount}</strong><button type="button" onClick={() => adultCount + studentCount < seats.length && setAdultCount(adultCount + 1)}>+</button></span></label><label>Sinh viên <span><button type="button" onClick={() => studentCount > 0 && setStudentCount(studentCount - 1)}>−</button><strong>{studentCount}</strong><button type="button" onClick={() => adultCount + studentCount < seats.length && setStudentCount(studentCount + 1)}>+</button></span></label></div></section>
        <section><h3><Ticket /> Trạng thái vé</h3><div className={styles.statusChoices}>{[['CONFIRMED','Đã xác nhận'],['HOLD','Giữ chỗ'],['BOARDED','Đã lên xe'],['NO_SHOW','Vắng khách']].map(([value,label]) => <button key={value} type="button" className={`${styles[`status${value}`]} ${form.status === value ? styles.selected : ''}`} onClick={() => setForm({ ...form, status: value })}><i />{label}</button>)}</div></section>
        <section><h3><MapPin /> Hành trình đón trả</h3><div className={styles.twoCols}><label>Điểm đón<input value={form.pickupLocation} onChange={(event) => setForm({ ...form, pickupLocation: event.target.value })} /></label><label>Điểm trả<input value={form.dropoffLocation} onChange={(event) => setForm({ ...form, dropoffLocation: event.target.value })} /></label></div></section>
        <section><h3><Banknote /> Thanh toán</h3><div className={`${styles.twoCols} ${styles.paymentFields}`}><label>Trạng thái<select value={form.paymentStatus} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value })}><option value="UNPAID">Chưa thanh toán</option>{form.paymentStatus === 'PARTIAL' && <option value="PARTIAL">Đã đặt cọc</option>}<option value="PAID">Đã thanh toán đủ</option></select></label><label>Phương thức<select value={form.paymentMethod} disabled={form.paymentStatus !== 'PARTIAL'} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option value="CASH">Tiền mặt</option><option value="TRANSFER">Chuyển khoản</option></select></label><p>{form.paymentStatus === 'PAID' ? 'Đã thanh toán đủ · Áp dụng chuyển khoản' : form.paymentStatus === 'UNPAID' ? 'Chưa thanh toán · Thu tiền mặt khi khách lên xe' : 'Đã đặt cọc · Giữ phương thức hiện tại'}</p></div></section>
        <section><h3><NotebookPen /> Ghi chú nội bộ</h3><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} maxLength={1000} placeholder="Thông tin cần lưu ý cho tổng đài hoặc tài xế..." /></section>
        <aside>Muốn thay đổi giờ chạy hoặc ghế ngồi? Hãy đóng cửa sổ này và chọn <strong>Đổi chuyến</strong> để hệ thống kiểm tra chỗ trống an toàn.</aside>
      </div>
      <footer><button type="button" className={styles.cancel} onClick={onClose}>Hủy bỏ</button><button type="button" className={styles.save} disabled={saving} onClick={save}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></footer>
    </section>
  </div>;
}
