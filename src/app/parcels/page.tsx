"use client";

import { useState, useEffect } from "react";
import { Package, Phone, MapPin, Truck, Clock, Plus, Edit2, Trash2, Search, Filter } from "lucide-react";
import styles from "../booking/page.module.css";
import toast from "react-hot-toast";

export default function ParcelsPage() {
  const [parcels, setParcels] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [editingParcel, setEditingParcel] = useState<any>(null);
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterRoute, setFilterRoute] = useState("ALL");

  const [formData, setFormData] = useState({
    senderName: "",
    senderPhone: "",
    receiverName: "",
    receiverPhone: "",
    description: "",
    fee: "",
    status: "PENDING",
    tripId: "",
    pickupLocation: "",
    dropoffLocation: "",
    notes: ""
  });

  useEffect(() => {
    fetchParcels();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [tripDate]);

  const getRealTimeParcelStatus = (parcel: any) => {
    if (parcel.status === 'CANCELLED' || parcel.status === 'DELIVERED') return parcel.status;
    if (!parcel.trip) return parcel.status;
    if (!parcel.trip.driverId) return 'PENDING';

    const tripDateObj = new Date(parcel.trip.travelDate);
    const today = new Date();
    
    const isToday = tripDateObj.getDate() === today.getDate() && 
                    tripDateObj.getMonth() === today.getMonth() && 
                    tripDateObj.getFullYear() === today.getFullYear();

    if (!isToday) {
      if (tripDateObj < today) return 'DELIVERED';
      return 'DELIVERING'; // Future trips, but has driver -> user said: already updated driver -> "Đang giao"
    }

    const [hours, minutes] = parcel.trip.schedule.departureTime.split(':').map(Number);
    const tripTime = new Date(tripDateObj);
    tripTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(tripTime);
    endTime.setHours(endTime.getHours() + 3);

    if (currentTime >= endTime) return 'DELIVERED';
    // If it has a driver and hasn't ended, it's delivering
    return 'DELIVERING'; 
  };

  const fetchParcels = () => {
    fetch("/api/parcels")
      .then(res => res.json())
      .then(data => {
        // Map dynamic statuses
        const processed = data.map((p: any) => {
          const dynamicStatus = getRealTimeParcelStatus(p);
          return { ...p, status: dynamicStatus, dbStatus: p.status };
        });
        setParcels(processed);
        setLoading(false);
      });
  };

  const fetchTrips = () => {
    fetch(`/api/parcels/trips?date=${tripDate}`)
      .then(res => res.json())
      .then(data => setTrips(data.trips || []));
  };

  const handleOpenAdd = () => {
    setEditingParcel(null);
    setFormData({
      senderName: "",
      senderPhone: "",
      receiverName: "",
      receiverPhone: "",
      description: "",
      fee: "",
      status: "PENDING",
      tripId: trips.length > 0 ? trips[0].id : "",
      pickupLocation: "",
      dropoffLocation: "",
      notes: ""
    });
    setShowModal(true);
  };

  const handleOpenEdit = (parcel: any) => {
    setEditingParcel(parcel);
    setFormData({
      senderName: parcel.senderName,
      senderPhone: parcel.senderPhone,
      receiverName: parcel.receiverName,
      receiverPhone: parcel.receiverPhone,
      description: parcel.description,
      fee: parcel.fee.toString(),
      status: parcel.status,
      tripId: parcel.tripId,
      pickupLocation: parcel.pickupLocation || "",
      dropoffLocation: parcel.dropoffLocation || "",
      notes: parcel.notes || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tripId) {
      toast.error("Vui lòng chọn chuyến xe");
      return;
    }
    try {
      const url = editingParcel ? `/api/parcels/${editingParcel.id}` : "/api/parcels";
      const method = editingParcel ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success(editingParcel ? "Cập nhật thành công!" : "Đã tạo đơn ký gửi!");
        setShowModal(false);
        fetchParcels();
      } else {
        toast.error("Lỗi khi lưu");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa đơn này?")) return;
    try {
      const res = await fetch(`/api/parcels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Đã xóa");
        fetchParcels();
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    }
  };

  const statusMap: any = {
    'PENDING': { label: 'Chờ xếp xe', color: '#f59e0b', bg: '#fef3c7' },
    'DELIVERING': { label: 'Đang giao', color: '#2563eb', bg: '#dbeafe' },
    'DELIVERED': { label: 'Đã đến / Đã nhận', color: '#16a34a', bg: '#dcfce3' },
    'CANCELLED': { label: 'Đã hủy', color: '#dc2626', bg: '#fee2e2' }
  };

  if (loading) return <div className={styles.container}>Đang tải...</div>;

  // Lấy danh sách các tuyến đường duy nhất từ dữ liệu đơn hàng
  const uniqueRoutes = Array.from(new Set(
    parcels
      .filter(p => p.trip?.route)
      .map(p => `${p.trip.route.origin} → ${p.trip.route.destination}`)
  ));

  const filteredParcels = parcels.filter((p) => {
    const matchesSearch = 
      p.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.senderPhone.includes(searchQuery) ||
      p.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.receiverPhone.includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "ALL" || p.status === filterStatus;
    
    const pDateStr = new Date(p.createdAt).toISOString().split('T')[0];
    const pDate = new Date(pDateStr);
    
    let matchesDate = true;
    if (filterFromDate) {
      matchesDate = matchesDate && pDate >= new Date(filterFromDate);
    }
    if (filterToDate) {
      matchesDate = matchesDate && pDate <= new Date(filterToDate);
    }

    let matchesRoute = true;
    if (filterRoute !== "ALL") {
      const routeName = p.trip?.route ? `${p.trip.route.origin} → ${p.trip.route.destination}` : 'Chưa xếp xe';
      matchesRoute = routeName === filterRoute;
    }

    return matchesSearch && matchesStatus && matchesDate && matchesRoute;
  });

  const applyQuickDate = (type: string) => {
    const today = new Date();
    const formatDate = (date: Date) => {
      const d = new Date(date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().split('T')[0];
    };
    
    let from = new Date();
    let to = new Date();

    if (type === 'today') {
      // from and to are already today
    } else if (type === 'yesterday') {
      from.setDate(today.getDate() - 1);
      to.setDate(today.getDate() - 1);
    } else if (type === 'this_week') {
      const day = today.getDay(); 
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
      from.setDate(diff);
    } else if (type === 'this_month') {
      from.setDate(1);
    }

    setFilterFromDate(formatDate(from));
    setFilterToDate(formatDate(to));
    setShowDateDropdown(false); 
  };

  return (
    <div className={styles.container} style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header className={styles.header} style={{ flexShrink: 0 }}>
        <h1 className={styles.title}>Quản lý Ký gửi Hàng hóa</h1>
        <button 
          onClick={handleOpenAdd}
          style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          + Tạo đơn ký gửi
        </button>
      </header>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', backgroundColor: 'var(--bg-base)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)', flexShrink: 0 }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-panel)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1, minWidth: '220px', transition: 'all 0.2s' }}>
          <Search size={16} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Tên, SĐT, mô tả..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-main)', fontSize: '0.9rem' }}
          />
        </div>
        
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-panel)', padding: '2px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <Filter size={16} style={{ color: 'var(--primary)' }} />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '6px 2px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer', width: 'auto', minWidth: '145px' }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xếp xe</option>
            <option value="DELIVERING">Đang giao</option>
            <option value="DELIVERED">Đã đến / Đã nhận</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        {/* Route */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-panel)', padding: '2px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <Truck size={16} style={{ color: 'var(--primary)' }} />
          <select 
            value={filterRoute}
            onChange={(e) => setFilterRoute(e.target.value)}
            style={{ padding: '6px 2px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer', width: 'auto', minWidth: '140px', maxWidth: '200px' }}
          >
            <option value="ALL">Tất cả tuyến</option>
            {uniqueRoutes.map(route => (
              <option key={route} value={route}>{route}</option>
            ))}
            <option value="Chưa xếp xe">Chưa xếp xe</option>
          </select>
        </div>

        {/* Unified Date Range Filter */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-panel)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem', outline: 'none' }}
          >
            <Clock size={16} style={{ color: 'var(--primary)' }} />
            {filterFromDate && filterToDate 
              ? `${new Date(filterFromDate).toLocaleDateString('vi-VN')} - ${new Date(filterToDate).toLocaleDateString('vi-VN')}`
              : filterFromDate ? `Từ ${new Date(filterFromDate).toLocaleDateString('vi-VN')}`
              : filterToDate ? `Đến ${new Date(filterToDate).toLocaleDateString('vi-VN')}`
              : "Tất cả ngày"}
          </button>
          
          {showDateDropdown && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>Lọc theo ngày</h4>
                {(filterFromDate || filterToDate) && (
                  <button onClick={() => { setFilterFromDate(''); setFilterToDate(''); }} style={{ fontSize: '0.8rem', color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Xóa lọc</button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                {/* Lựa chọn nhanh */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderRight: '1px solid var(--border-color)', paddingRight: '16px', flexShrink: 0 }}>
                  <button onClick={() => applyQuickDate('today')} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-base)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>Hôm nay</button>
                  <button onClick={() => applyQuickDate('yesterday')} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-base)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>Hôm qua</button>
                  <button onClick={() => applyQuickDate('this_week')} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-base)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>Tuần này</button>
                  <button onClick={() => applyQuickDate('this_month')} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-base)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>Tháng này</button>
                </div>

                {/* Tùy chọn (Custom Range) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tùy chọn</div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Từ ngày:</div>
                    <input 
                      type="date" 
                      value={filterFromDate}
                      onChange={(e) => setFilterFromDate(e.target.value)}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Đến ngày:</div>
                    <input 
                      type="date" 
                      value={filterToDate}
                      onChange={(e) => {
                        setFilterToDate(e.target.value);
                        if (!filterFromDate) setFilterFromDate(e.target.value);
                      }}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button 
                      onClick={() => setShowDateDropdown(false)}
                      style={{ padding: '6px 16px', fontSize: '0.8rem', backgroundColor: 'var(--primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', fontWeight: 600 }}
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(240px, 1fr))', gap: '16px', overflowX: 'auto', paddingBottom: '16px', width: '100%', flex: 1, minHeight: 0 }}>
        {Object.entries(statusMap).map(([statusKey, s]: [string, any]) => {
          const columnParcels = filteredParcels.filter(p => p.status === statusKey);
          
          return (
            <div key={statusKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-panel)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid', borderBottomColor: s.color, paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color }}></div>
                  {s.label}
                </h3>
                <span style={{ backgroundColor: 'var(--bg-base)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {columnParcels.length}
                </span>
              </div>

              {/* Cards Container (Scrollable) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px', paddingBottom: '8px' }}>
                {columnParcels.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '24px 0' }}>Không có đơn</div>
                )}
                
                {columnParcels.map(p => {
                  const tripName = p.trip?.route ? `${p.trip.route.origin} → ${p.trip.route.destination}` : 'Chưa xếp xe';
                  const tripTime = p.trip?.schedule?.departureTime || '';
                  
                  return (
                    <div 
                      key={p.id} 
                      style={{ 
                        backgroundColor: 'var(--bg-base)', borderRadius: '8px', padding: '12px', 
                        border: '1px solid var(--border-color)', borderLeft: `4px solid ${s.color}`,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s', position: 'relative'
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'none'}
                    >
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Package size={14} style={{ color: 'var(--primary)' }} /> {p.description}
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button onClick={() => handleOpenEdit(p)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }} title="Sửa"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(p.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--danger)' }} title="Xóa"><Trash2 size={14} /></button>
                        </div>
                      </div>

                      {/* Route Info */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'var(--bg-panel)', padding: '6px 8px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary)' }}>
                          <Truck size={12} /> {tripName}
                        </div>
                        {tripTime && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={12} /> Đi lúc: {tripTime}
                          </div>
                        )}
                      </div>

                      {/* Notes Info */}
                      {p.notes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '8px', backgroundColor: '#fef9c3', padding: '6px 8px', borderRadius: '6px', borderLeft: '3px solid #facc15' }}>
                          <span style={{ fontWeight: 600 }}>Ghi chú: </span>
                          {p.notes}
                        </div>
                      )}

                      {/* Sender / Receiver - COMPACT */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', marginBottom: '8px' }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Người gửi</div>
                          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.senderName}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}><Phone size={10} style={{display:'inline'}}/> {p.senderPhone}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Người nhận</div>
                          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.receiverName}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}><Phone size={10} style={{display:'inline'}}/> {p.receiverPhone}</div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div style={{ paddingTop: '8px', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.fee)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-panel)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem' }}>{editingParcel ? "Cập nhật đơn hàng" : "Tạo đơn hàng mới"}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Tên người gửi</label>
                  <input required type="text" className={styles.input} value={formData.senderName} onChange={e => setFormData({...formData, senderName: e.target.value})} />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>SĐT người gửi</label>
                  <input required type="text" className={styles.input} value={formData.senderPhone} onChange={e => setFormData({...formData, senderPhone: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Tên người nhận</label>
                  <input required type="text" className={styles.input} value={formData.receiverName} onChange={e => setFormData({...formData, receiverName: e.target.value})} />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>SĐT người nhận</label>
                  <input required type="text" className={styles.input} value={formData.receiverPhone} onChange={e => setFormData({...formData, receiverPhone: e.target.value})} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mô tả hàng hóa (VD: 1 thùng xốp, 2 tài liệu)</label>
                <input required type="text" className={styles.input} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Điểm nhận hàng (Người gửi)</label>
                  <input type="text" className={styles.input} placeholder="VD: 123 Lê Lợi, Đà Nẵng" value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value})} />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Điểm trả hàng (Người nhận)</label>
                  <input type="text" className={styles.input} placeholder="VD: Bến xe Huế" value={formData.dropoffLocation} onChange={e => setFormData({...formData, dropoffLocation: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Cước phí (VNĐ)</label>
                  <input required type="number" className={styles.input} value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Trạng thái</label>
                  <select className={styles.input} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="PENDING">Chờ xếp xe</option>
                    <option value="DELIVERING">Đang giao</option>
                    <option value="DELIVERED">Đã nhận</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '16px' }}>
                <div className={styles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
                  <label className={styles.label}>Ngày khởi hành</label>
                  <input type="date" className={styles.input} value={tripDate} onChange={e => setTripDate(e.target.value)} />
                </div>
                <div className={styles.formGroup} style={{ flex: 2, marginBottom: 0 }}>
                  <label className={styles.label}>Xếp lên chuyến xe</label>
                  <select required className={styles.input} value={formData.tripId} onChange={e => setFormData({...formData, tripId: e.target.value})}>
                    <option value="">-- Chọn chuyến xe --</option>
                    {(() => {
                      const groupedTrips: { [key: string]: any[] } = {};
                      trips.forEach(t => {
                        const routeName = `${t.route?.origin} → ${t.route?.destination}`;
                        if (!groupedTrips[routeName]) groupedTrips[routeName] = [];
                        groupedTrips[routeName].push(t);
                      });
                      
                      return Object.entries(groupedTrips).map(([routeName, routeTrips]) => (
                        <optgroup key={routeName} label={routeName}>
                          {routeTrips.map(t => (
                            <option key={t.id} value={t.id}>
                              [{t.schedule?.departureTime}] Xe: {t.vehicle?.plateNumber} | TX: {t.driver ? `${t.driver.name} (${t.driver.phone})` : 'Chưa xếp TX'}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Ghi chú thêm</label>
                <input type="text" className={styles.input} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} className={styles.btnSecondary}>Hủy</button>
                <button type="submit" className={styles.btnPrimary}>Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
