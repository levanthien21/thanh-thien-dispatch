"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bus, Users, Ticket } from "lucide-react";
import styles from "../booking/page.module.css";
import tripStyles from "./trips.module.css";

export default function TripsPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getRealTimeStatus = (trip: any) => {
    const tripDate = new Date(trip.travelDate);
    const today = new Date();
    
    const isToday = tripDate.getDate() === today.getDate() && 
                    tripDate.getMonth() === today.getMonth() && 
                    tripDate.getFullYear() === today.getFullYear();
    
    if (!isToday) {
      if (tripDate < today) return { label: 'Đã xong', status: 'COMPLETED' };
      return { label: 'Sắp chạy', status: 'SCHEDULED' };
    }

    if (trip.status === 'CANCELLED') return { label: 'Đã hủy', status: 'CANCELLED' };
    
    const [hours, minutes] = trip.schedule.departureTime.split(':').map(Number);
    const tripTime = new Date(tripDate);
    tripTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(tripTime);
    endTime.setHours(endTime.getHours() + 3);

    if (currentTime >= endTime) return { label: 'Đã xong', status: 'COMPLETED' };
    if (currentTime >= tripTime) return { label: 'Đang chạy', status: 'IN_PROGRESS' };
    return { label: 'Sắp chạy', status: 'SCHEDULED' };
  };

  useEffect(() => {
    fetch('/api/routes')
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          setRoutes(data.routes);
          setSelectedRouteId(data.routes[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (selectedRouteId && date) {
      setLoading(true);
      fetch(`/api/trips?routeId=${selectedRouteId}&date=${date}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.trips) setTrips(data.trips);
          setLoading(false);
        });
    }
  }, [selectedRouteId, date]);

  const filteredTrips = trips.filter(trip => {
    if (statusFilter === "ALL") return true;
    const rtStatus = getRealTimeStatus(trip);
    if (statusFilter === "COMPLETED") return rtStatus.status === "COMPLETED";
    if (statusFilter === "CANCELLED") return rtStatus.status === "CANCELLED";
    if (statusFilter === "FULL") return trip.isFull;
    if (statusFilter === "AVAILABLE") return !trip.isFull && rtStatus.status !== "COMPLETED" && rtStatus.status !== "CANCELLED";
    return true;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản Lý Chuyến Xe</h1>
      </header>

      <div className={styles.bookingForm} style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div className={styles.formGroup} style={{ flex: 1, minWidth: '300px' }}>
            <label className={styles.label}>Tuyến đường</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {routes.map(r => (
                <button 
                  key={r.id}
                  type="button" 
                  onClick={() => setSelectedRouteId(r.id)}
                  className={`${styles.btnSecondary} ${selectedRouteId === r.id ? styles.btnPrimary : ''}`} 
                  style={{ flex: 1, padding: '12px' }}
                >
                  {r.origin.toUpperCase()} → {r.destination.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.formGroup} style={{ width: '200px' }}>
            <label className={styles.label}>Ngày đi</label>
            <input 
              type="date" 
              className={styles.input} 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className={styles.formGroup} style={{ width: '200px' }}>
            <label className={styles.label}>Trạng thái</label>
            <select 
              className={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả</option>
              <option value="AVAILABLE">Còn trống</option>
              <option value="FULL">Đã đầy</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Trips List */}
        <div>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>Danh sách chuyến ({date})</h2>
          
          {loading ? (
            <div style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
          ) : (
            <div className={tripStyles.grid}>
              {filteredTrips.length === 0 ? <div style={{ color: 'var(--text-muted)' }}>Không có chuyến nào khớp với bộ lọc.</div> : null}
              {filteredTrips.map(trip => {
                const fillPercentage = Math.min(100, Math.round((trip.bookedSeats / trip.capacity) * 100));
                const rtStatus = getRealTimeStatus(trip);
                
                return (
                  <div 
                    key={trip.id}
                    style={{ 
                      transition: 'all 0.2s ease', 
                      display: 'flex', 
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-panel)',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <div style={{ padding: '20px 20px 12px 20px' }}>
                      {/* Header: Time & Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>
                          {trip.time}
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', 
                          backgroundColor: rtStatus.status === 'SCHEDULED' ? 'rgba(0, 158, 219, 0.1)' : 
                                           rtStatus.status === 'IN_PROGRESS' ? 'rgba(245, 158, 11, 0.1)' :
                                           rtStatus.status === 'COMPLETED' ? 'rgba(22, 163, 74, 0.1)' : 'var(--bg-base)', 
                          color: rtStatus.status === 'SCHEDULED' ? 'var(--primary)' : 
                                 rtStatus.status === 'IN_PROGRESS' ? '#f59e0b' :
                                 rtStatus.status === 'COMPLETED' ? '#16a34a' : 'var(--text-muted)' 
                        }}>
                          {rtStatus.label}
                        </div>
                      </div>
                      
                      {/* Vehicle Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '12px' }}>
                        <div style={{ padding: '6px', background: 'var(--bg-base)', borderRadius: '6px', color: 'var(--text-muted)' }}>
                          <Bus size={16} />
                        </div>
                        <div>
                          <strong style={{ fontWeight: 700 }}>{trip.plateNumber || 'Chưa xếp xe'}</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({trip.vehicleName || trip.vehicleType})</span>
                        </div>
                      </div>

                      {/* Seats & Price Badges */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <div style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', 
                          backgroundColor: trip.available > 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                          borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600,
                          color: trip.available > 0 ? 'var(--success)' : 'var(--danger)'
                        }}>
                          <Users size={14} /> 
                          {trip.available > 0 ? `Còn ${trip.available} chỗ` : 'Hết chỗ'}
                        </div>

                        {trip.basePrice && (
                          <div style={{ 
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', 
                            backgroundColor: 'var(--bg-base)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)'
                          }}>
                            <Ticket size={14} style={{ color: 'var(--primary)' }} />
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.basePrice)}
                          </div>
                        )}
                      </div>

                      {/* Progress */}
                      <div style={{ marginTop: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          <span>Tỉ lệ lấp đầy</span>
                          <span>{trip.bookedSeats} / {trip.capacity}</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: 'var(--bg-base)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{ 
                              height: '100%', 
                              width: `${fillPercentage}%`, 
                              backgroundColor: fillPercentage >= 100 ? 'var(--danger)' : fillPercentage >= 80 ? 'var(--warning)' : 'var(--success)',
                              transition: 'width 0.5s ease-out' 
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div style={{ 
                      display: 'flex', gap: '10px', padding: '16px 20px', 
                      backgroundColor: 'var(--bg-base)', borderTop: '1px solid var(--border-color)' 
                    }}>
                      <Link href={`/trips/${trip.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                        <button style={{ 
                          width: '100%', padding: '10px', background: 'transparent', 
                          border: '1px solid var(--border-color)', borderRadius: '8px', 
                          color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                          display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }} onMouseOver={e => {e.currentTarget.style.background = 'var(--bg-panel)'; e.currentTarget.style.borderColor = 'var(--primary)'}} onMouseOut={e => {e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-color)'}}>
                          Chi tiết
                        </button>
                      </Link>
                      {trip.available > 0 && rtStatus.status === 'SCHEDULED' ? (
                        <Link href={`/booking`} style={{ flex: 1, textDecoration: 'none' }}>
                          <button style={{ 
                            width: '100%', padding: '10px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                            border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer', 
                            transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0, 158, 219, 0.4)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center'
                          }} onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.15)'} onMouseOut={e => e.currentTarget.style.filter = 'none'}>
                            Đặt ngay
                          </button>
                        </Link>
                      ) : (
                        <button disabled style={{ 
                          flex: 1, padding: '10px', background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', 
                          borderRadius: '8px', color: 'var(--text-muted)', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 
                        }}>
                          Hết vé
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
