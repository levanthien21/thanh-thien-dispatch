"use client";

import { useState, useEffect } from "react";
import { User, Phone, Star, Ticket } from "lucide-react";
import styles from "../booking/page.module.css";
import reportStyles from "../reports/reports.module.css";
import settingsStyles from "../settings/settings.module.css";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (res.ok) setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  // Compute metrics
  const totalCustomers = customers.length;
  let totalRevenue = 0;
  let totalVIPs = 0;

  const processedCustomers = customers.map(c => {
    const totalSpent = c.bookings.reduce((sum: number, b: any) => sum + b.total, 0);
    const ticketsCount = c.bookings.reduce((sum: number, b: any) => sum + b.passengerCount, 0);
    
    totalRevenue += totalSpent;
    
    let type = 'NEW';
    if (ticketsCount >= 5 || totalSpent >= 2000000) {
      type = 'VIP';
      totalVIPs++;
    } else if (ticketsCount >= 2) {
      type = 'REGULAR';
    }

    return { ...c, totalSpent, ticketsCount, type };
  });

  // Filter
  const filteredCustomers = processedCustomers.filter(c => {
    // Search
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    if (!matchSearch) return false;

    // Tier
    if (tierFilter !== "ALL" && c.type !== tierFilter) return false;

    // Date
    if (startDate) {
      const cDate = new Date(c.createdAt);
      const sDate = new Date(startDate);
      if (cDate < sDate) return false;
    }
    if (endDate) {
      const cDate = new Date(c.createdAt);
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      if (cDate > eDate) return false;
    }

    return true;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
        <h1 className={styles.title}>Quản lý Khách Hàng (CRM)</h1>
        
        <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '16px', backgroundColor: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div className={styles.formGroup} style={{ flex: 2, minWidth: '250px' }}>
            <label className={styles.label}>Tìm kiếm</label>
            <input 
              type="text" 
              placeholder="Tên hoặc Số điện thoại..." 
              className={styles.input}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className={styles.formGroup} style={{ flex: 1, minWidth: '150px' }}>
            <label className={styles.label}>Hạng thành viên</label>
            <select 
              className={styles.select}
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
            >
              <option value="ALL">Tất cả</option>
              <option value="VIP">VIP (Vàng)</option>
              <option value="REGULAR">Khách quen (Bạc)</option>
              <option value="NEW">Khách mới (Đồng)</option>
            </select>
          </div>
          <div className={styles.formGroup} style={{ flex: 1, minWidth: '150px' }}>
            <label className={styles.label}>Từ ngày</label>
            <input 
              type="date" 
              className={styles.input}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className={styles.formGroup} style={{ flex: 1, minWidth: '150px' }}>
            <label className={styles.label}>Đến ngày</label>
            <input 
              type="date" 
              className={styles.input}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải danh sách khách hàng...</div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className={reportStyles.grid} style={{ marginBottom: '32px' }}>
            <div className={reportStyles.card}>
              <h3 className={reportStyles.cardTitle}>Tổng Khách Hàng</h3>
              <p className={reportStyles.cardValue}>{totalCustomers}</p>
            </div>
            <div className={reportStyles.card}>
              <h3 className={reportStyles.cardTitle}>Khách Hàng VIP</h3>
              <p className={reportStyles.cardValue} style={{ color: '#f59e0b' }}>{totalVIPs}</p>
            </div>
            <div className={reportStyles.card} style={{ gridColumn: 'span 2' }}>
              <h3 className={reportStyles.cardTitle}>Tổng Giá Trị (LTV)</h3>
              <p className={reportStyles.cardValue} style={{ color: 'var(--success)' }}>
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>

          {/* Grid of Customer Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {filteredCustomers.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy khách hàng</div>
            ) : null}
            
            {filteredCustomers.map(c => (
              <div 
                key={c.id} 
                style={{ 
                  display: 'flex', flexDirection: 'column', 
                  backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '16px', 
                  overflow: 'hidden', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.borderColor = c.type === 'VIP' ? '#f59e0b' : 'var(--primary)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                {/* Card Header */}
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', 
                  borderBottom: '1px solid var(--border-color)',
                  background: c.type === 'VIP' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.15))' : 'var(--bg-base)'
                }}>
                  <div style={{ 
                    width: '56px', height: '56px', borderRadius: '50%', 
                    backgroundColor: c.type === 'VIP' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-panel)', 
                    color: c.type === 'VIP' ? '#f59e0b' : 'var(--text-muted)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    border: c.type === 'VIP' ? '2px solid #f59e0b' : '1px solid var(--border-color)'
                  }}>
                    <User size={28} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {c.name}
                      {c.type === 'VIP' && <Star size={16} fill="#f59e0b" color="#f59e0b" />}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                      <Phone size={14} /> {c.phone}
                    </p>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Tổng chi tiêu (LTV)</p>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
                      {formatCurrency(c.totalSpent)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Lượt đi</p>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      <Ticket size={16} /> {c.ticketsCount} vé
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-base)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {c.type === 'VIP' && <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 700, fontSize: '0.75rem' }}>VIP</span>}
                    {c.type === 'REGULAR' && <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 700, fontSize: '0.75rem' }}>Thành viên</span>}
                    {c.type === 'NEW' && <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem' }}>Khách mới</span>}
                  </div>
                  
                  <button 
                    onClick={() => setSelectedCustomer(c)}
                    style={{ 
                      padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid var(--primary)', 
                      color: 'var(--primary)', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      fontSize: '0.85rem'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--primary)'; }}
                  >
                    Lịch sử
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* History Modal */}
      {selectedCustomer && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCustomer(null)}>
          <div className={styles.modalContent} style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: '8px' }}>Lịch sử giao dịch</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Khách hàng: <strong style={{ color: 'var(--text-base)' }}>{selectedCustomer.name}</strong> - {selectedCustomer.phone}
            </p>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {selectedCustomer.bookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Chưa có chuyến đi nào</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedCustomer.bookings.map((b: any) => (
                    <div key={b.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-base)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 600 }}>{b.trip?.route?.origin} {'->'} {b.trip?.route?.destination}</div>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(b.total)}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <div>Ngày đi: {b.trip?.travelDate ? new Date(b.trip.travelDate).toLocaleDateString('vi-VN') : 'N/A'} {b.trip?.schedule?.departureTime}</div>
                        <div>Số ghế: {b.seatNumbers || b.passengerCount + ' vé'}</div>
                      </div>
                      <div style={{ fontSize: '0.85rem', marginTop: '8px', color: 'var(--info)' }}>
                        Mã vé: {b.bookingCode} | Trạng thái: {b.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalActions} style={{ marginTop: '24px' }}>
              <button className={styles.btnSecondary} onClick={() => setSelectedCustomer(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
