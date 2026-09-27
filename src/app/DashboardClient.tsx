"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Bus, CalendarDays, CheckCircle2, Clock3, Package, Phone, Plus, Search, Ticket, TrendingUp, UserRound, Users } from 'lucide-react';
import styles from './page.module.css';

export default function DashboardClient({ todayFormatted, selectedDateStr, stats, tripsByRoute, totalTrips, activeRouteIds }: any) {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [status, setStatus] = useState('ALL');
  const [shift, setShift] = useState('ALL');
  const [route, setRoute] = useState('ALL');
  const [isSyncingDate, setIsSyncingDate] = useState(false);
  const syncedDate = useRef<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (syncedDate.current === selectedDateStr) return;
    syncedDate.current = selectedDateStr;

    const syncTrips = async () => {
      setIsSyncingDate(true);
      try {
        // Keep this sequential so routes cannot receive the same vehicle at the same time.
        for (const routeId of activeRouteIds as string[]) {
          const response = await fetch(`/api/trips?routeId=${encodeURIComponent(routeId)}&date=${encodeURIComponent(selectedDateStr)}`, { method: 'POST' });
          if (!response.ok) throw new Error('Không thể đồng bộ lịch chuyến');
        }
        router.refresh();
      } catch (error) {
        console.error(error);
      } finally {
        setIsSyncingDate(false);
      }
    };

    void syncTrips();
  }, [activeRouteIds, router, selectedDateStr]);

  const tripStatus = (trip: any) => {
    if (trip.status === 'CANCELLED') return { label: 'Đã hủy', code: 'CANCELLED' };
    const date = new Date(trip.travelDate);
    const [hours, minutes] = trip.schedule.departureTime.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    const end = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    if (now >= end) return { label: 'Hoàn thành', code: 'COMPLETED' };
    if (now >= date) return { label: 'Đang chạy', code: 'IN_PROGRESS' };
    return { label: 'Sắp chạy', code: 'SCHEDULED' };
  };

  const groups = useMemo(() => Object.entries(tripsByRoute).sort(([first], [second]) => {
    const priority = (name: string) => name.toLocaleLowerCase('vi').startsWith('chu lai') ? 0 : 1;
    return priority(first) - priority(second) || first.localeCompare(second, 'vi');
  }).map(([name, rawTrips]) => {
    const trips = (rawTrips as any[]).filter((trip) => {
      if (route !== 'ALL' && name !== route) return false;
      const hour = Number(trip.schedule.departureTime.split(':')[0]);
      if (shift === 'MORNING' && hour >= 12) return false;
      if (shift === 'AFTERNOON' && (hour < 12 || hour >= 18)) return false;
      if (shift === 'EVENING' && hour < 18) return false;
      if (status === 'ALL') return true;
      const used = trip.bookings.reduce((sum: number, b: any) => sum + b.passengerCount, 0);
      const state = tripStatus(trip).code;
      if (status === 'AVAILABLE') return used < trip.vehicle.seatCapacity && !['COMPLETED', 'CANCELLED'].includes(state);
      if (status === 'FULL') return used >= trip.vehicle.seatCapacity;
      return state === status;
    });
    return [name, trips] as const;
  }).filter(([, trips]) => trips.length), [tripsByRoute, route, shift, status, now]);

  const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  const cards = [
    { label: 'Đơn đặt vé', value: stats.totalBookings, note: 'trong ngày đã chọn', icon: Ticket, tone: 'blue' },
    { label: 'Hành khách', value: stats.totalPassengers, note: `${totalTrips} chuyến vận hành`, icon: Users, tone: 'red' },
    { label: 'Giá trị vé', value: money.format(stats.totalRevenue), note: 'vé đã xác nhận', icon: CheckCircle2, tone: 'green' },
    { label: 'Lấp đầy', value: `${stats.occupancyRate}%`, note: 'trên tổng số ghế', icon: TrendingUp, tone: 'amber' },
  ];

  return <div className={styles.page}>
    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>Trung tâm vận hành</span><h1>Chào ngày mới, Thanh Thiện</h1><p>{todayFormatted} · Theo dõi chuyến và xử lý khách trên một màn hình.</p></div>
      <div className={`${styles.datePicker} ${isSyncingDate ? styles.datePickerLoading : ''}`}>
        <span>Ngày vận hành</span>
        <strong>{todayFormatted.replace(/^./, (character: string) => character.toUpperCase())}</strong>
        <button type="button" aria-label="Mở lịch chọn ngày" onClick={() => {
          const input = dateInputRef.current;
          if (!input) return;
          const showPicker = (input as unknown as { showPicker?: () => void }).showPicker;
          if (showPicker) showPicker.call(input);
          else input.click();
        }}><CalendarDays size={19} aria-hidden="true" /></button>
        <input ref={dateInputRef} aria-label="Chọn ngày vận hành" type="date" value={selectedDateStr} onChange={(e) => {
          if (e.target.value) router.push(`/?date=${encodeURIComponent(e.target.value)}`);
        }} />
      </div>
    </section>

    <section className={styles.actionBar}>
      <div className={styles.actionTitle}><span>Thao tác nhanh</span><small>Phục vụ khách trong ít bước nhất</small></div>
      <Link href="/booking" className={styles.actionPrimary}><Plus /><span><strong>Tạo đơn vé</strong><small>Alt + B</small></span></Link>
      <Link href="/search" className={styles.action}><Search /><span><strong>Tra cứu khách</strong><small>SĐT hoặc mã vé</small></span></Link>
      <Link href="/parcels" className={styles.action}><Package /><span><strong>Nhận ký gửi</strong><small>Tạo vận đơn</small></span></Link>
    </section>

    <section className={styles.stats}>{cards.map(({ label, value, note, icon: Icon, tone }) => <article className={styles.stat} key={label}>
      <div className={`${styles.statIcon} ${styles[tone]}`}><Icon /></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    </article>)}</section>

    <section className={styles.board}>
      <div className={styles.boardHeader}><div><span className={styles.eyebrow}>Lịch xe</span><h2>Chuyến vận hành <b>{totalTrips}</b></h2></div><div className={styles.filters}>
        <select aria-label="Lọc tuyến" value={route} onChange={(e) => setRoute(e.target.value)}><option value="ALL">Tất cả tuyến</option>{Object.keys(tripsByRoute).map((name) => <option key={name}>{name}</option>)}</select>
        <select aria-label="Lọc ca" value={shift} onChange={(e) => setShift(e.target.value)}><option value="ALL">Tất cả ca</option><option value="MORNING">Buổi sáng</option><option value="AFTERNOON">Buổi chiều</option><option value="EVENING">Buổi tối</option></select>
        <select aria-label="Lọc trạng thái" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">Mọi trạng thái</option><option value="AVAILABLE">Còn chỗ</option><option value="FULL">Đã đầy</option><option value="IN_PROGRESS">Đang chạy</option><option value="COMPLETED">Hoàn thành</option><option value="CANCELLED">Đã hủy</option></select>
      </div></div>
      <div className={`${styles.boardBody} ${groups.length >= 2 ? styles.twoRoutes : ''}`}>{groups.length === 0 ? <div className={styles.empty}><Bus /><strong>Không có chuyến phù hợp</strong><span>Thử thay đổi ngày hoặc bộ lọc.</span></div> : groups.map(([name, trips], routeIndex) => <div className={styles.routeGroup} key={name}>
        <h3><span className={styles.routeNumber}>{routeIndex + 1}</span><span className={styles.routeName}><small>Tuyến cố định {routeIndex + 1}</small>{name}</span><span className={styles.routeCount}>{trips.length} chuyến</span></h3>
        <div className={styles.tripColumns} aria-hidden="true"><span>Khởi hành</span><span>Phân công</span><span>Tình trạng ghế</span><span>Vé & cảnh báo</span><span>Thao tác</span></div>
        <div className={styles.tripGrid}>{trips.map((trip: any) => {
          const used = trip.bookings.reduce((sum: number, b: any) => sum + b.passengerCount, 0);
          const capacity = trip.vehicle.seatCapacity;
          const free = Math.max(0, capacity - used);
          const state = tripStatus(trip);
          const holding = trip.bookings.filter((b: any) => b.status === 'HOLD').reduce((sum: number, b: any) => sum + b.passengerCount, 0);
          const unpaid = trip.bookings.filter((b: any) => b.paymentStatus !== 'PAID').length;
          const revenue = trip.bookings.filter((b: any) => b.status !== 'CANCELLED').reduce((sum: number, b: any) => sum + b.total, 0);
          return <article className={`${styles.trip} ${styles[`trip${state.code}`] || ''}`} key={trip.id}>
            <div className={styles.tripTop}><div><span className={styles.departLabel}>Khởi hành</span><time>{trip.schedule.departureTime}</time></div><span className={`${styles.status} ${styles[state.code]}`}><i />{state.label}</span></div>
            <div className={styles.tripDetails}>
              <div><Bus /><span><small>Phương tiện</small><strong>{trip.vehicle.plateNumber}</strong><em>{trip.vehicle.name.toLowerCase().includes(trip.vehicle.type.toLowerCase()) ? trip.vehicle.name : `${trip.vehicle.name} · ${trip.vehicle.type}`}</em></span></div>
              <div className={!trip.driver ? styles.driverWarning : ''}>{trip.driver ? <UserRound /> : <AlertTriangle />}<span><small>Tài xế</small><strong>{trip.driver?.name || 'Chưa phân công'}</strong>{trip.driver && <em><Phone />{trip.driver.phone}</em>}</span></div>
            </div>
            <div className={styles.seatSummary}>
              <div className={styles.seatAvailability}><strong>{free}</strong><span>ghế trống</span></div>
            </div>
            <div className={styles.tripNotes}><span><Ticket />Giá trị vé: <strong>{money.format(revenue)}</strong></span><div>{holding > 0 && <span className={styles.holdNote}><Clock3 />{holding} giữ chỗ</span>}{unpaid > 0 && <span className={styles.unpaidNote}>{unpaid} chưa thanh toán</span>}</div></div>
            <div className={styles.tripActions}><Link className={styles.detailButton} href={`/trips/${trip.id}`}>Chi tiết</Link>{free > 0 && state.code === 'SCHEDULED' ? <Link className={styles.book} href={`/booking?routeId=${trip.routeId}&tripId=${trip.id}&date=${selectedDateStr}`}>Đặt vé <ArrowRight /></Link> : <span className={`${styles.soldOut} ${styles[`closed${state.code}`] || ''}`}>{state.code === 'SCHEDULED' ? 'Hết vé' : state.code === 'CANCELLED' ? 'Đã hủy' : 'Đã chạy'}</span>}</div>
          </article>;
        })}</div>
      </div>)}</div>
    </section>
  </div>;
}
