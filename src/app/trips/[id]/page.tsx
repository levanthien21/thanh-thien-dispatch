"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import styles from "../../booking/page.module.css";
import tripStyles from "../trips.module.css";
import SeatMap from "../../booking/SeatMap";
import TransferBookingModal from "./TransferBookingModal";
import EditBookingWidget from './EditBookingWidget';
import { ArrowRightLeft } from 'lucide-react';

export default function TripManifestPage() {
  const { id } = useParams();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [canDispatch, setCanDispatch] = useState(false);

  // Edit State
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [transferringBooking, setTransferringBooking] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [adultCount, setAdultCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [isRoundTrip, setIsRoundTrip] = useState(false);

  const [editForm, setEditForm] = useState({
    pickupLocation: '',
    dropoffLocation: '',
    status: '',
    paymentStatus: '',
    paymentMethod: '',
    notes: ''
  });

  useEffect(() => {
    const totalSeats = selectedSeats.length;
    if (adultCount + studentCount !== totalSeats) {
      if (studentCount > totalSeats) {
        setStudentCount(totalSeats);
        setAdultCount(0);
      } else {
        setAdultCount(totalSeats - studentCount);
      }
    }
  }, [selectedSeats.length]);

  const openEditModal = (booking: any) => {
    setEditingBooking(booking);
    setEditForm({
      pickupLocation: booking.pickupLocation || '',
      dropoffLocation: booking.dropoffLocation || '',
      status: booking.status || 'CONFIRMED',
      paymentStatus: booking.paymentStatus || 'UNPAID',
      paymentMethod: booking.paymentMethod || 'CASH',
      notes: booking.notes || ''
    });

    const seats = booking.seatNumbers ? booking.seatNumbers.split(',') : [];
    setSelectedSeats(seats);
    
    let aCount = 0;
    let sCount = 0;
    if (booking.ticketType && booking.ticketType.includes('ADULT:')) {
      const parts = booking.ticketType.split(',');
      aCount = parseInt(parts.find((p: string) => p.startsWith('ADULT:'))?.split(':')[1] || '0');
      sCount = parseInt(parts.find((p: string) => p.startsWith('STUDENT:'))?.split(':')[1] || '0');
    } else if (booking.ticketType === 'ADULT') {
      aCount = booking.passengerCount;
    } else if (booking.ticketType === 'STUDENT') {
      sCount = booking.passengerCount;
    } else {
      aCount = booking.passengerCount;
    }
    setAdultCount(aCount);
    setStudentCount(sCount);
    setIsRoundTrip(booking.isRoundTrip || false);
  };

  const handleSaveEdit = async () => {
    if (selectedSeats.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ghế");
      return;
    }

    // Legacy editor fallback: only submit safe metadata. Seat, passenger and price
    // changes belong to the dedicated transfer flow and must never be inferred here.
    const finalForm = { ...editForm };

    try {
      const res = await fetch(`/api/bookings/${editingBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalForm)
      });
      if (res.ok) {
        alert("Cập nhật thành công!");
        setEditingBooking(null);
        fetchTrip();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Lỗi khi cập nhật");
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [id]);

  const fetchTrip = () => {
    fetch(`/api/trips/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.trip) setTrip(data.trip);
        setLoading(false);
      });
    
    fetch('/api/drivers')
      .then(async res => res.ok ? res.json() : [])
      .then(data => setDrivers(Array.isArray(data) ? data : []))
      .catch(() => setDrivers([]));

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCanDispatch(['DISPATCHER', 'ADMIN'].includes(data.user?.role)))
      .catch(() => setCanDispatch(false));
  };

  const handleAssignDriver = async (driverId: string) => {
    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId })
      });
      if (res.ok) fetchTrip();
    } catch (e) {
      alert("Lỗi khi gán tài xế");
    }
  };

  const handleReconcile = async () => {
    if (!confirm("Xác nhận đã thu đủ tiền mặt từ tài xế cho tất cả các vé chưa thanh toán?")) return;
    try {
      const res = await fetch(`/api/trips/${id}/reconcile`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert(`Đã chốt ca thành công! Cập nhật ${data.count} vé thành Đã thanh toán.`);
          fetchTrip();
        } else {
          alert(data.message || "Không có vé nào cần chốt.");
        }
      }
    } catch (e) {
      alert("Lỗi chốt ca");
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm("Xác nhận HỦY VÉ này? Ghế sẽ được trả lại ngay.")) return;
    const cancelReason = prompt("Lý do hủy vé (không bắt buộc):", "Khách thay đổi kế hoạch");
    if (cancelReason === null) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', cancelReason })
      });
      if (res.ok) {
        toast.success("Đã hủy vé và trả lại ghế");
        fetchTrip();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Không thể hủy vé");
      }
    } catch (e) {
      toast.error("Không thể kết nối để hủy vé");
    }
  };

  const updateStatus = async (bookingId: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchTrip();
      }
    } catch (e) {
      alert("Có lỗi xảy ra");
    }
  };

  if (loading) return <div className={styles.container}>Đang tải dữ liệu...</div>;
  if (!trip) return <div className={styles.container}>Không tìm thấy chuyến xe</div>;

  const activeBookings = trip.bookings.filter((b: any) => b.status !== 'CANCELLED');
  const bookedSeats = activeBookings.reduce((sum: number, b: any) => sum + b.passengerCount, 0);
  const capacity = trip.vehicle.seatCapacity;
  const available = capacity - bookedSeats;

  const exportCSV = () => {
    const headers = ["Mã vé", "Tên khách", "Số điện thoại", "Điểm đón", "Điểm trả", "Số ghế", "Trạng thái", "Thanh toán", "Tổng tiền", "Ghi chú"];
    
    const rows = activeBookings.map((b: any) => {
      const statusMap: any = {
        'CONFIRMED': 'Đã xác nhận',
        'HOLD': 'Đang giữ chỗ',
        'BOARDED': 'Đã lên xe',
        'NO_SHOW': 'Không đến',
        'CANCELLED': 'Đã hủy'
      };
      
      const paymentMap: any = {
        'PAID': 'Đã thanh toán đủ',
        'PARTIAL': 'Đã cọc',
        'UNPAID': 'Chưa thanh toán'
      };

      return [
        b.bookingCode,
        b.customer.name,
        `="${b.customer.phone}"`,
        b.pickupLocation,
        b.dropoffLocation,
        b.seatNumbers || `${b.passengerCount} ghế`,
        statusMap[b.status] || b.status,
        paymentMap[b.paymentStatus] || b.paymentStatus,
        b.total,
        b.notes || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = "\uFEFF" + [
      `Tài xế:,${trip.driver ? trip.driver.name : 'Chưa phân công'} - ${trip.driver ? trip.driver.phone : ''}`,
      "",
      headers.join(","),
      ...rows
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DS_Khach_${trip.route.origin}-${trip.route.destination}_${new Date(trip.travelDate).toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate unpaid cash
  const unpaidCashTickets = activeBookings.filter((b: any) => b.paymentStatus === 'UNPAID' && b.paymentMethod === 'CASH');
  const cashToCollect = unpaidCashTickets.reduce((sum: number, b: any) => sum + b.total, 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className={`${styles.btnSecondary} no-print`} 
              onClick={() => window.history.back()}
              style={{ padding: '8px 12px' }}
            >
              ← Quay lại
            </button>
            <h1 className={styles.title}>
              Danh sách khách: {trip.route.origin} → {trip.route.destination} ({trip.schedule.departureTime})
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }} className="no-print">
            <button 
              onClick={exportCSV}
              style={{ padding: '8px 16px', backgroundColor: 'var(--success)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Xuất Excel (CSV)
            </button>
            <button 
              onClick={() => window.print()}
              style={{ padding: '8px 16px', backgroundColor: 'var(--text-main)', color: 'var(--bg-base)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              In Lệnh Chạy
            </button>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            .no-print, nav, aside { display: none !important; }
            body { background: white !important; color: black !important; }
            .action-col { display: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}} />
      </header>

      <div className={styles.bookingForm} style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Trip Stats */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Ngày: </span>
            <span style={{ fontWeight: 600 }}>{new Date(trip.travelDate).toLocaleDateString('vi-VN')}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Xe: </span>
            <span style={{ fontWeight: 600 }}>{trip.vehicle.plateNumber} ({trip.vehicle.name})</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Tình trạng chỗ: </span>
            <span style={{ fontWeight: 600, color: available > 0 ? 'var(--success)' : 'var(--danger)' }}>
              {bookedSeats} / {capacity}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Tài xế: </span>
            {canDispatch ? <select 
              className="no-print"
              value={trip.driverId || ""} 
              onChange={e => handleAssignDriver(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 600 }}
            >
              <option value="">-- Chọn tài xế --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
              ))}
            </select> : <span style={{ fontWeight: 600 }}>{trip.driver ? `${trip.driver.name} - ${trip.driver.phone}` : 'Chưa phân công'}</span>}
            <span style={{ display: 'none', fontWeight: 600 }} className="print-only">
              {trip.driver ? `${trip.driver.name} - ${trip.driver.phone}` : 'Chưa phân công'}
            </span>
          </div>
        </div>

        {/* Reconciliation Panel */}
        {canDispatch && <div className="no-print" style={{ backgroundColor: 'var(--bg-panel)', border: '1px dashed var(--primary)', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Chốt ca & Quản lý thu hộ</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Có {unpaidCashTickets.length} vé chưa thanh toán (Tiền mặt). Tổng tiền tài xế phải nộp lại:
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>
              {cashToCollect.toLocaleString('vi-VN')} đ
            </span>
            {cashToCollect > 0 && (
              <button 
                onClick={handleReconcile}
                style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Xác nhận đã thu tiền
              </button>
            )}
          </div>
        </div>}

        {/* Passenger List Table */}
        <h2 className={styles.sectionTitle}>Hành khách ({activeBookings.length} vé)</h2>
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 8px' }}>Mã vé</th>
                <th style={{ padding: '12px 8px' }}>Khách hàng</th>
                <th style={{ padding: '12px 8px' }}>Ghế & Vé</th>
                <th style={{ padding: '12px 8px' }}>Lộ trình</th>
                <th style={{ padding: '12px 8px' }}>Trạng thái</th>
                <th style={{ padding: '12px 8px' }}>Thanh toán</th>
                <th className="action-col" style={{ padding: '12px 8px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {activeBookings.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có hành khách nào</td></tr>
              ) : null}
              {activeBookings.map((b: any) => {
                // Parse ticket type
                let ticketDetails = b.ticketType;
                if (b.ticketType.includes('ADULT:')) {
                  const parts = b.ticketType.split(',');
                  const adultCount = parts.find((p: string) => p.startsWith('ADULT:'))?.split(':')[1] || '0';
                  const studentCount = parts.find((p: string) => p.startsWith('STUDENT:'))?.split(':')[1] || '0';
                  const details = [];
                  if (parseInt(adultCount) > 0) details.push(`${adultCount} Người lớn`);
                  if (parseInt(studentCount) > 0) details.push(`${studentCount} SV`);
                  ticketDetails = details.join(' + ');
                } else if (b.ticketType === 'ADULT') ticketDetails = `${b.passengerCount} Người lớn`;
                else if (b.ticketType === 'STUDENT') ticketDetails = `${b.passengerCount} SV`;

                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--primary)', verticalAlign: 'top' }}>
                      {b.bookingCode}
                    </td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600 }}>{b.customer.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.customer.phone}</div>
                      {b.notes && b.notes.includes('[Đã gửi ZNS]') && (
                        <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#fff', backgroundColor: '#0068ff', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                          ✓ Đã gửi Zalo
                        </div>
                      )}
                      {b.notes && b.notes.replace('[Đã gửi ZNS]', '').trim() !== '' && (
                        <div style={{ marginTop: '4px', fontSize: '0.8rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                          Ghi chú: {b.notes.replace('[Đã gửi ZNS]', '').trim()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600 }}>{b.seatNumbers || `${b.passengerCount} ghế`}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{ticketDetails}</div>
                    </td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '0.85rem' }}><strong style={{color:'var(--text-muted)'}}>Đón:</strong> {b.pickupLocation}</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '4px' }}><strong style={{color:'var(--text-muted)'}}>Trả:</strong> {b.dropoffLocation}</div>
                    </td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      {b.status === 'BOARDED' 
                        ? <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#064e3b', color: '#34d399', whiteSpace: 'nowrap' }}>Đã lên xe</span>
                        : b.status === 'NO_SHOW'
                        ? <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f3f4f6', color: '#6b7280', whiteSpace: 'nowrap' }}>Không đến</span>
                        : b.status === 'CONFIRMED' 
                        ? <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a', whiteSpace: 'nowrap' }}>Đã xác nhận</span>
                        : <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(245,158,11,0.1)', color: '#d97706', whiteSpace: 'nowrap' }}>Đang giữ chỗ</span>
                      }
                    </td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.total)}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexDirection: 'column', alignItems: 'flex-start' }}>
                        {b.paymentStatus === 'PAID' && <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: 'var(--success)', color: '#fff', whiteSpace: 'nowrap' }}>Đã thanh toán đủ</span>}
                        {b.paymentStatus === 'PARTIAL' && <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: '#f59e0b', color: '#fff', whiteSpace: 'nowrap' }}>Đã cọc</span>}
                        {b.paymentStatus === 'UNPAID' && <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: 'var(--danger)', color: '#fff', whiteSpace: 'nowrap' }}>Chưa thanh toán</span>}
                        
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Qua {b.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                        </span>
                      </div>
                    </td>
                    <td className="action-col" style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        {!['BOARDED', 'CANCELLED'].includes(b.status) && <button
                          onClick={() => setTransferringBooking(b)}
                          title="Chuyển vé này sang ngày hoặc giờ chạy khác"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '34px', background: 'linear-gradient(135deg, #009fda, #087cae)', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 9px', cursor: 'pointer', fontWeight: 700, boxShadow: '0 5px 12px rgba(0,145,200,.18)' }}>
                          <ArrowRightLeft size={15} /> Chuyển vé
                        </button>}
                        {b.status !== 'BOARDED' && b.status !== 'NO_SHOW' && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => updateStatus(b.id, 'BOARDED')} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>Lên xe</button>
                            <button onClick={() => updateStatus(b.id, 'NO_SHOW')} style={{ flex: 1, background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>Vắng</button>
                          </div>
                        )}
                        <button 
                          onClick={() => openEditModal(b)}
                          style={{ 
                            background: 'transparent', 
                            color: 'var(--primary)', 
                            border: '1px solid var(--primary)', 
                            borderRadius: '4px', 
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}>
                            Sửa
                        </button>
                        <button 
                          onClick={() => cancelBooking(b.id)}
                        style={{ 
                          background: 'transparent', 
                          color: 'var(--danger)', 
                          border: '1px solid var(--danger)', 
                          borderRadius: '4px', 
                          padding: '4px 8px',
                          cursor: 'pointer'
                        }}>
                          Hủy
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parcel List Table */}
      {trip.parcels && trip.parcels.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 className={styles.sectionTitle}>Hàng hóa ký gửi ({trip.parcels.length} đơn)</h2>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 8px' }}>Mã / Ngày</th>
                  <th style={{ padding: '12px 8px' }}>Hàng hóa</th>
                  <th style={{ padding: '12px 8px' }}>Người gửi</th>
                  <th style={{ padding: '12px 8px' }}>Người nhận</th>
                  <th style={{ padding: '12px 8px' }}>Trạng thái</th>
                  <th style={{ padding: '12px 8px' }}>Cước phí</th>
                </tr>
              </thead>
              <tbody>
                {trip.parcels.map((p: any) => {
                  const statusMap: any = {
                    'PENDING': { label: 'Chờ xếp xe', color: '#f59e0b', bg: '#fef3c7' },
                    'DELIVERING': { label: 'Đang giao', color: '#2563eb', bg: '#dbeafe' },
                    'DELIVERED': { label: 'Đã nhận', color: '#16a34a', bg: '#dcfce3' },
                    'CANCELLED': { label: 'Đã hủy', color: '#dc2626', bg: '#fee2e2' }
                  };
                  const s = statusMap[p.status];
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 500 }}>{p.description}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 600 }}>{p.senderName}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.senderPhone}</div>
                        {p.pickupLocation && <div style={{ fontSize: '0.75rem', color: '#0068ff', marginTop: '4px' }}>📍 {p.pickupLocation}</div>}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 600 }}>{p.receiverName}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.receiverPhone}</div>
                        {p.dropoffLocation && <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px' }}>📍 {p.dropoffLocation}</div>}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--primary)' }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.fee)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {false && editingBooking && (() => {
        const otherBookings = trip.bookings.filter((b: any) => b.status !== 'CANCELLED' && b.id !== editingBooking.id);
        const bookedSeatsList = otherBookings.map((b: any) => b.seatNumbers).filter(Boolean).join(',').split(',').filter(Boolean);
        const subtotal = (adultCount * 130000) + (studentCount * 120000);
        const discount = isRoundTrip ? 20000 * selectedSeats.length : 0;
        const total = subtotal - discount;

        return (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-base)', padding: '24px', borderRadius: '12px',
            width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
            display: 'flex', gap: '24px'
          }}>
            {/* Left Column: Form */}
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Sửa vé: {editingBooking.bookingCode}</h2>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Trạng thái vé</label>
                <select 
                  value={editForm.status} 
                  onChange={e => setEditForm({...editForm, status: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}
                >
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="HOLD">Đang giữ chỗ</option>
                  <option value="BOARDED">Đã lên xe</option>
                  <option value="NO_SHOW">Không đến</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px', display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Điểm đón</label>
                  <input 
                    type="text" value={editForm.pickupLocation} 
                    onChange={e => setEditForm({...editForm, pickupLocation: e.target.value})}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Điểm trả</label>
                  <input 
                    type="text" value={editForm.dropoffLocation} 
                    onChange={e => setEditForm({...editForm, dropoffLocation: e.target.value})}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px', display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Trạng thái TT</label>
                  <select 
                    value={editForm.paymentStatus} 
                    onChange={e => setEditForm({...editForm, paymentStatus: e.target.value})}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}
                  >
                    <option value="UNPAID">Chưa thanh toán</option>
                    <option value="PARTIAL">Đã cọc</option>
                    <option value="PAID">Đã thanh toán đủ</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Phương thức TT</label>
                  <select 
                    value={editForm.paymentMethod} 
                    onChange={e => setEditForm({...editForm, paymentMethod: e.target.value})}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="TRANSFER">Chuyển khoản</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Chi tiết Giá vé</label>
                <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Người lớn (130k)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button type="button" className={styles.btnSecondary} style={{ padding: '4px 8px' }} onClick={() => { if (adultCount > 0) { setAdultCount(a => a - 1); setStudentCount(s => s + 1); } }}>-</button>
                      <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{adultCount}</span>
                      <button type="button" className={styles.btnSecondary} style={{ padding: '4px 8px' }} onClick={() => { if (studentCount > 0) { setAdultCount(a => a + 1); setStudentCount(s => s - 1); } }}>+</button>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Sinh viên (120k)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button type="button" className={styles.btnSecondary} style={{ padding: '4px 8px' }} onClick={() => { if (studentCount > 0) { setStudentCount(s => s - 1); setAdultCount(a => a + 1); } }}>-</button>
                      <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{studentCount}</span>
                      <button type="button" className={styles.btnSecondary} style={{ padding: '4px 8px' }} onClick={() => { if (adultCount > 0) { setStudentCount(s => s + 1); setAdultCount(a => a - 1); } }}>+</button>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'right' }}>
                  Tổng: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Ghi chú</label>
                <textarea 
                  value={editForm.notes} 
                  onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', minHeight: '60px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setEditingBooking(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleSaveEdit}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>

            {/* Right Column: Seat Map */}
            <div style={{ width: '280px', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
              <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Sơ đồ xe</h3>
              <div style={{ transform: 'scale(0.85)', transformOrigin: 'top left' }}>
                <SeatMap 
                  vehicleType={trip.vehicle.name}
                  bookedSeatsList={bookedSeatsList}
                  selectedSeats={selectedSeats}
                  onToggleSeat={(seatId: string) => {
                    setSelectedSeats(prev => 
                      prev.includes(seatId) ? prev.filter(id => id !== seatId) : [...prev, seatId]
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        );
      })()}
      {editingBooking && <EditBookingWidget booking={editingBooking} trip={trip} onClose={() => setEditingBooking(null)} onDone={() => { setEditingBooking(null); fetchTrip(); }} />}
      {transferringBooking && <TransferBookingModal booking={transferringBooking} trip={trip} onClose={() => setTransferringBooking(null)} onDone={() => { setTransferringBooking(null); fetchTrip(); }} />}

    </div>
  );
}
