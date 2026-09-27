import { prisma } from "@/lib/prisma";
import Link from "next/link";
import styles from "../page.module.css";
import { Search, Ticket, Package } from "lucide-react";
import SearchFilters from "./SearchFilters";
import BookingActions from "./BookingActions";

export default async function SearchPage(props: { searchParams: Promise<{ q?: string, type?: string, timeRange?: string, startDate?: string, endDate?: string, startTime?: string, endTime?: string }> }) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || '';
  const type = searchParams?.type || 'ticket';
  const timeRange = searchParams?.timeRange || 'all';
  const startDateStr = searchParams?.startDate || '';
  const endDateStr = searchParams?.endDate || '';
  const startTime = searchParams?.startTime || '';
  const endTime = searchParams?.endTime || '';
  
  console.log("SearchPage Params:", { q, type, timeRange, startDateStr, endDateStr, startTime, endTime });

  let bookings: any[] = [];
  let parcels: any[] = [];
  
  let filterStartDate: Date | undefined;
  let filterEndDate: Date | undefined;
  const now = new Date();
  
  if (startDateStr || endDateStr) {
    if (startDateStr) {
      filterStartDate = new Date(startDateStr);
      filterStartDate.setHours(0, 0, 0, 0);
    }
    if (endDateStr) {
      filterEndDate = new Date(endDateStr);
      filterEndDate.setHours(23, 59, 59, 999);
    }
  } else if (timeRange === 'day') {
    filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    filterEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (timeRange === 'week') {
    const day = now.getDay() || 7; 
    const diff = now.getDate() - day + 1;
    filterStartDate = new Date(now.getFullYear(), now.getMonth(), diff);
    filterStartDate.setHours(0, 0, 0, 0);
    filterEndDate = new Date(filterStartDate.getTime());
    filterEndDate.setDate(filterStartDate.getDate() + 6);
    filterEndDate.setHours(23, 59, 59, 999);
  } else if (timeRange === 'month') {
    filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    filterEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (timeRange === 'year') {
    filterStartDate = new Date(now.getFullYear(), 0, 1);
    filterEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  const baseWhere: any = {};
  if (filterStartDate && filterEndDate) {
    baseWhere.createdAt = { gte: filterStartDate, lte: filterEndDate };
  } else if (filterStartDate) {
    baseWhere.createdAt = { gte: filterStartDate };
  } else if (filterEndDate) {
    baseWhere.createdAt = { lte: filterEndDate };
  }

  if (startTime || endTime) {
    baseWhere.trip = { schedule: { departureTime: {} } };
    if (startTime) baseWhere.trip.schedule.departureTime.gte = startTime;
    if (endTime) baseWhere.trip.schedule.departureTime.lte = endTime;
  }

  console.log("BaseWhere computed:", baseWhere);

  if (type === 'ticket') {
    bookings = await prisma.booking.findMany({
      where: q && q.length >= 2 ? {
        ...baseWhere,
        OR: [
          { bookingCode: { contains: q } },
          { customer: { phone: { contains: q } } },
          { customer: { name: { contains: q } } }
        ]
      } : baseWhere,
      include: {
        customer: true,
        trip: {
          include: {
            route: true,
            schedule: true,
            vehicle: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  } else if (type === 'parcel') {
    parcels = await prisma.parcel.findMany({
      where: q && q.length >= 2 ? {
        ...baseWhere,
        OR: [
          { senderPhone: { contains: q } },
          { receiverPhone: { contains: q } },
          { id: { contains: q } }
        ]
      } : baseWhere,
      include: {
        trip: {
          include: {
            route: true,
            schedule: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className={styles.container}>
      <header style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%', marginBottom: '16px' }}>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <h1 className={styles.title} style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Cổng Tra Cứu Toàn Diện</h1>
          <p style={{ color: 'var(--text-muted)' }}>Tra cứu nhanh chóng mọi thông tin Vé xe và Hàng hóa ký gửi</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-panel)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
          <Link 
            href={`/search?q=${q}&type=ticket`} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 32px', 
              borderRadius: '8px', textDecoration: 'none', fontWeight: 600, transition: '0.2s',
              backgroundColor: type === 'ticket' ? 'var(--primary)' : 'transparent',
              color: type === 'ticket' ? 'white' : 'var(--text-muted)'
            }}
          >
            <Ticket size={18} /> Tra cứu Vé
          </Link>
          <Link 
            href={`/search?q=${q}&type=parcel`} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 32px', 
              borderRadius: '8px', textDecoration: 'none', fontWeight: 600, transition: '0.2s',
              backgroundColor: type === 'parcel' ? '#f59e0b' : 'transparent',
              color: type === 'parcel' ? 'white' : 'var(--text-muted)'
            }}
          >
            <Package size={18} /> Tra cứu Hàng
          </Link>
        </div>
        
        <form method="GET" action="/search" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', width: '100%', maxWidth: '1000px' }}>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-panel)', padding: '8px', borderRadius: '16px', border: `2px solid ${type === 'ticket' ? 'var(--primary)' : '#f59e0b'}`, width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)' }}>
            <Search size={24} style={{ color: 'var(--text-muted)', marginLeft: '12px' }} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="timeRange" value={timeRange} />
            <input type="hidden" name="startDate" value={startDateStr} />
            <input type="hidden" name="endDate" value={endDateStr} />
            <input type="hidden" name="startTime" value={startTime} />
            <input type="hidden" name="endTime" value={endTime} />
            
            <input 
              type="text" 
              name="q"
              defaultValue={q}
              placeholder={type === 'ticket' ? "Nhập Số điện thoại, Tên hành khách hoặc Mã vé..." : "Nhập Số điện thoại người gửi/nhận..."}
              style={{ padding: '12px', border: 'none', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', flex: 1, fontSize: '1.1rem' }} 
              autoFocus
            />
            <button type="submit" style={{ padding: '14px 40px', backgroundColor: type === 'ticket' ? 'var(--primary)' : '#f59e0b', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '1.05rem', transition: 'transform 0.1s' }}>
              Tìm kiếm
            </button>
          </div>

          {/* FILTERS */}
          <SearchFilters timeRange={timeRange} startDate={startDateStr} endDate={endDateStr} startTime={startTime} endTime={endTime} q={q} type={type} />
        </form>
      </header>

      <section style={{ marginTop: '32px' }}>
        {q && type === 'ticket' && bookings.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-panel)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            Không tìm thấy kết quả vé nào cho "{q}"
          </div>
        )}
        
        {q && type === 'parcel' && parcels.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-panel)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            Không tìm thấy kiện hàng nào cho "{q}"
          </div>
        )}

        {/* TICKET RESULTS */}
        {type === 'ticket' && bookings.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              {q ? `Tìm thấy ${bookings.length} kết quả vé` : `Lịch sử Đặt vé Gần đây (${bookings.length})`}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px', backgroundColor: 'var(--bg-panel)', borderRadius: '12px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Mã vé</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Khách hàng</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Chuyến đi</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Trạng thái</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px', fontWeight: 600, color: 'var(--primary)' }}>{b.bookingCode}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600 }}>{b.customer.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.customer.phone}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600 }}>{b.trip.route.origin} → {b.trip.route.destination}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(b.trip.travelDate).toLocaleDateString('vi-VN')} • {b.trip.schedule.departureTime}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {b.status === 'BOARDED' ? <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#064e3b', color: '#34d399' }}>Đã lên xe</span>
                        : b.status === 'NO_SHOW' ? <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f3f4f6', color: '#6b7280' }}>Không đến</span>
                        : b.status === 'CONFIRMED' ? <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>Đã xác nhận</span>
                        : b.status === 'CANCELLED' ? <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Đã hủy</span>
                        : <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(245,158,11,0.1)', color: '#d97706' }}>Đang giữ chỗ</span>
                      }
                    </td>
                    <td style={{ padding: '16px' }}>
                      <BookingActions booking={b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PARCEL RESULTS */}
        {type === 'parcel' && parcels.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              {q ? `Tìm thấy ${parcels.length} kết quả kiện hàng` : `Lịch sử Đơn hàng Gần đây (${parcels.length})`}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px', backgroundColor: 'var(--bg-panel)', borderRadius: '12px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Mã gửi / Thông tin</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Người gửi & Nhận</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Hành trình</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Trạng thái</th>
                  <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right' }}>Cước phí</th>
                </tr>
              </thead>
              <tbody>
                {parcels.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600, color: '#f59e0b' }}>P{p.id.substring(0,6).toUpperCase()}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={p.description}>{p.description}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Gửi: </span>
                        <span style={{ fontWeight: 600 }}>{p.senderName}</span> ({p.senderPhone})
                      </div>
                      <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Nhận: </span>
                        <span style={{ fontWeight: 600 }}>{p.receiverName}</span> ({p.receiverPhone})
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600 }}>{p.trip.route.origin} → {p.trip.route.destination}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(p.trip.travelDate).toLocaleDateString('vi-VN')} • {p.trip.schedule.departureTime}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {(() => {
                        let dynamicStatus = p.status;
                        if (p.status !== 'CANCELLED' && p.status !== 'DELIVERED') {
                          if (!p.trip?.driverId) {
                            dynamicStatus = 'PENDING';
                          } else {
                            const tripDateObj = new Date(p.trip.travelDate);
                            const today = new Date();
                            const isToday = tripDateObj.getDate() === today.getDate() && 
                                            tripDateObj.getMonth() === today.getMonth() && 
                                            tripDateObj.getFullYear() === today.getFullYear();
                            
                            if (!isToday) {
                              dynamicStatus = tripDateObj < today ? 'DELIVERED' : 'DELIVERING';
                            } else {
                              const [hours, minutes] = p.trip.schedule.departureTime.split(':').map(Number);
                              const tripTime = new Date(tripDateObj);
                              tripTime.setHours(hours, minutes, 0, 0);
                              
                              const endTime = new Date(tripTime);
                              endTime.setHours(endTime.getHours() + 3);
                              
                              if (today >= endTime) dynamicStatus = 'DELIVERED';
                              else dynamicStatus = 'DELIVERING';
                            }
                          }
                        }

                        if (dynamicStatus === 'DELIVERED') return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#064e3b', color: '#34d399' }}>Đã đến / Đã nhận</span>;
                        if (dynamicStatus === 'DELIVERING') return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>Đang giao</span>;
                        if (dynamicStatus === 'CANCELLED') return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Đã hủy</span>;
                        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(245,158,11,0.1)', color: '#d97706' }}>Chờ xếp xe</span>;
                      })()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                      {formatCurrency(p.fee)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {bookings.length === 0 && parcels.length === 0 && (
          <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Search size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p>Chưa có dữ liệu lịch sử hoặc kết quả tìm kiếm.</p>
          </div>
        )}
      </section>
    </div>
  );
}
