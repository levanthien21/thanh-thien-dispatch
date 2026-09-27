"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import SeatMap from "./SeatMap";
import toast from "react-hot-toast";
import BookingAdjustmentLookup from "./BookingAdjustmentLookup";

const tripCanDepart = (date: string, time: string) => new Date(`${date}T${time}:00`).getTime() > Date.now();

function LocationAutocomplete({ label, value, onChange, placeholder, cityContext, disabled }: any) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Prevent fetching on empty or initial value load if not focused
    if (!query || !isOpen) {
      setSuggestions([]);
      return;
    }
    
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        let apiUrl = `/api/maps/autocomplete?q=${encodeURIComponent(query)}`;
        if (cityContext) {
          apiUrl += `&location=${encodeURIComponent(cityContext)}`;
        }
        const res = await fetch(apiUrl);
        const data = await res.json();
        setSuggestions(data.results || []);
        setFocusedIndex(-1);
      } catch(e) {}
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, isOpen, cityContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[focusedIndex]);
      }
      // If no suggestion is explicitly focused, do NOT prevent default.
      // This allows the user to press Enter to submit the form with their custom text!
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelect = (s: any) => {
    setQuery(s.title);
    onChange(s.title);
    setIsOpen(false);
  };

  // Re-sync query if value prop changes externally (e.g. CRM auto-fill)
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
    }
  }, [value]);

  return (
    <div className={styles.formGroup} ref={wrapperRef} style={{ position: 'relative' }}>
      <label className={styles.label}>{label}</label>
      <input 
        type="text" 
        className={styles.input} 
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => query && !disabled && setIsOpen(true)}
        placeholder={placeholder}
        required
        disabled={disabled}
        style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
      />
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '4px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxHeight: '300px', overflowY: 'auto' }}>
          {loading && <div style={{ padding: '12px', color: 'var(--text-muted)' }}>Đang tìm kiếm...</div>}
          {!loading && suggestions.length === 0 && <div style={{ padding: '12px', color: 'var(--text-muted)' }}>Không tìm thấy kết quả</div>}
          {suggestions.map((s, idx) => (
            <div 
              key={idx} 
              onClick={() => handleSelect(s)}
              style={{ 
                padding: '12px', 
                borderBottom: '1px solid var(--border-color)', 
                cursor: 'pointer', 
                transition: 'background-color 0.2s',
                backgroundColor: focusedIndex === idx ? 'var(--bg-base)' : 'transparent'
              }}
              onMouseOver={() => setFocusedIndex(idx)}
            >
              <div style={{ fontWeight: 600 }}>{s.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.address}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingPageContent() {
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams?.get('date') || new Date().toISOString().split('T')[0]);
  const [selectedRouteId, setSelectedRouteId] = useState(searchParams?.get('routeId') || "");
  const [selectedTripId, setSelectedTripId] = useState(searchParams?.get('tripId') || "");
  const [routes, setRoutes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const passengerCount = Math.max(1, selectedSeats.length);
  const [adultCount, setAdultCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [sendSms, setSendSms] = useState(true);

  // Return trip state
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnRouteId, setReturnRouteId] = useState("");
  const [returnTrips, setReturnTrips] = useState<any[]>([]);
  const [selectedReturnTripId, setSelectedReturnTripId] = useState("");
  const [selectedReturnSeats, setSelectedReturnSeats] = useState<string[]>([]);
  const [isCustomReturnLocation, setIsCustomReturnLocation] = useState(false);
  const [returnPickup, setReturnPickup] = useState("");
  const [returnDropoff, setReturnDropoff] = useState("");

  const [loading, setLoading] = useState(false);
  // --- Giá thực tế từ DB ---
  const [effectivePrices, setEffectivePrices] = useState<{
    adultPrice: number; studentPrice: number;
    baseAdult: number; baseStudent: number;
    holidayApplied: boolean; holidayName: string | null;
    adjustSummary: string; adjustMode: string | null;
  }>({
    adultPrice: 130000, studentPrice: 120000,
    baseAdult: 130000, baseStudent: 120000,
    holidayApplied: false, holidayName: null,
    adjustSummary: '', adjustMode: null,
  });
  const [returnEffectivePrices, setReturnEffectivePrices] = useState({ adultPrice: 130000, studentPrice: 120000 });

  useEffect(() => {
    const qName = searchParams?.get('name');
    const qPhone = searchParams?.get('phone');
    const qRoute = searchParams?.get('route');
    const qPickup = searchParams?.get('pickup');

    if (qName) setName(qName);
    if (qPhone) setPhone(qPhone);
    if (qPickup) setPickup(qPickup);
    
    // If qRoute exists, we will try to match it when routes are loaded in the other useEffect
    if (qRoute) {
      sessionStorage.setItem('ai_route', qRoute);
    }
  }, [searchParams]);
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [lastBookedTripId, setLastBookedTripId] = useState("");
  
  // Suggestion logic state
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Fetch giá thực tế (có thể đã điều chỉnh theo ngày lễ)
  useEffect(() => {
    if (!selectedRouteId || !date) return;
    fetch(`/api/settings/prices/effective?routeId=${selectedRouteId}&date=${date}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setEffectivePrices(d); })
      .catch(() => {});
  }, [selectedRouteId, date]);

  useEffect(() => {
    if (!isRoundTrip || !returnRouteId || !returnDate) return;
    fetch(`/api/settings/prices/effective?routeId=${returnRouteId}&date=${returnDate}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setReturnEffectivePrices({ adultPrice: d.adultPrice, studentPrice: d.studentPrice }); })
      .catch(() => {});
  }, [isRoundTrip, returnRouteId, returnDate]);

  useEffect(() => {
    fetch('/api/routes')
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          setRoutes(data.routes);
          const aiRoute = sessionStorage.getItem('ai_route');
          if (aiRoute && !searchParams?.get('routeId')) {
            const matchedRoute = data.routes.find((r: any) => `${r.origin} → ${r.destination}` === aiRoute);
            if (matchedRoute) {
              setSelectedRouteId(matchedRoute.id);
            }
            sessionStorage.removeItem('ai_route');
          }
        }
      });
  }, [searchParams]);

  // Auto-focus phone when route is selected
  useEffect(() => {
    if (selectedRouteId && phoneInputRef.current && !searchParams?.get('tripId')) {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    }
  }, [selectedRouteId, searchParams]);

  useEffect(() => {
    if (selectedRouteId && date) {
      fetch(`/api/trips?routeId=${selectedRouteId}&date=${date}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.trips) {
            setTrips(data.trips);
            if (searchParams?.get('tripId')) {
              // Auto scroll to Seat Map slightly after render
              setTimeout(() => {
                document.getElementById('field-seats')?.scrollIntoView({ behavior: 'smooth' });
              }, 500);
            } else {
              const firstAvailable = data.trips.find((t: any) => !t.isFull && tripCanDepart(date, t.time));
              if (firstAvailable) {
                setSelectedTripId(firstAvailable.id);
              } else {
                setSelectedTripId("");
              }
            }
            // Clear seats on trip change
            setSelectedSeats([]);
            setAdultCount(0);
            setStudentCount(0);
          }
        });
    }
  }, [selectedRouteId, date]);

  useEffect(() => {
    if (isRoundTrip && selectedRouteId) {
      const currentRoute = routes.find(r => r.id === selectedRouteId);
      if (currentRoute) {
        const revRoute = routes.find(r => r.origin === currentRoute.destination && r.destination === currentRoute.origin);
        if (revRoute) {
          setReturnRouteId(revRoute.id);
          fetch(`/api/trips?routeId=${revRoute.id}&date=${returnDate}`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
              if (data.trips) {
                setReturnTrips(data.trips);
                const firstAvailable = data.trips.find((t: any) => !t.isFull && tripCanDepart(returnDate, t.time));
                if (firstAvailable) {
                  setSelectedReturnTripId(firstAvailable.id);
                } else {
                  setSelectedReturnTripId("");
                }
              }
            });
        }
      }
    }
  }, [isRoundTrip, selectedRouteId, returnDate, routes]);

  // Sync ticket counts with seat selection
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

  // Real-time auto-suggest customer & smart location fill
  useEffect(() => {
    const fetchCustomer = async () => {
      if (phone.length >= 10) {
        setIsSearchingCustomer(true);
        try {
          const res = await fetch(`/api/search?q=${phone}`);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const match = data.results.find((r: any) => r.customerPhone === phone);
            if (match) {
              if (!name) setName(match.customerName);
              // Smart Location Auto-fill (only if currently empty)
              if (match.bookings && match.bookings.length > 0) {
                const lastBooking = match.bookings[0]; // Assuming sorted by latest
                if (lastBooking.pickupLocation && pickup === "") {
                  setPickup(lastBooking.pickupLocation);
                }
                if (lastBooking.dropoffLocation && dropoff === "") {
                  setDropoff(lastBooking.dropoffLocation);
                }
              }
              toast.success(`Đã tự động điền khách quen: ${match.customerName}`);
            }
          }
        } catch(e) {}
        setIsSearchingCustomer(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchCustomer();
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    
    let newErrors: { [key: string]: string } = {};

    if (!selectedTripId) {
      newErrors.trip = "Vui lòng chọn giờ khởi hành hợp lệ";
    }
    
    const phoneRegex = /^(84|0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(phone)) {
      newErrors.phone = "Số điện thoại không hợp lệ (Phải có 10 chữ số, VD: 0912345678)";
    }
    
    if (!pickup) newErrors.pickup = "Vui lòng nhập Điểm đón";
    if (!dropoff) newErrors.dropoff = "Vui lòng nhập Điểm trả";
    
    if (selectedSeats.length === 0) {
      newErrors.seats = "Vui lòng chọn ít nhất 1 ghế trên sơ đồ xe";
    }
    if (isRoundTrip && (!selectedReturnTripId || selectedReturnSeats.length !== selectedSeats.length)) {
      newErrors.returnSeats = "Vui lòng chọn đủ ghế cho chiều về";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Vui lòng kiểm tra lại các thông tin bị lỗi bên dưới", { duration: 6000 });
      setLoading(false);
      
      setTimeout(() => {
        const firstErrorKey = Object.keys(newErrors)[0];
        const errorElement = document.getElementById(`field-${firstErrorKey}`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = errorElement.querySelector('input, select');
          if (input) (input as HTMLElement).focus();
        }
      }, 100);
      
      return;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name,
          tripId: selectedTripId,
          passengerCount,
          seatNumbers: selectedSeats.join(','),
          ticketType: `ADULT:${adultCount},STUDENT:${studentCount}`,
          pickupLocation: pickup,
          dropoffLocation: dropoff,
          isRoundTrip,
          returnTripId: isRoundTrip ? selectedReturnTripId : undefined,
          returnSeatNumbers: isRoundTrip ? selectedReturnSeats.join(',') : undefined,
          returnPickupLocation: isRoundTrip ? (isCustomReturnLocation ? returnPickup : dropoff) : undefined,
          returnDropoffLocation: isRoundTrip ? (isCustomReturnLocation ? returnDropoff : pickup) : undefined,
          paymentMethod,
          paymentStatus,
          notes,
          sendSms
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(`Đã tạo vé ${data.booking.bookingCode}`, { id: 'booking-created', duration: 8000 });
        
        if (sendSms && phone) {
          if (data.sms?.status === 'SENT') toast.success(`eSMS đã tiếp nhận tin xác nhận · ${phone}`, { id: 'sms-confirmation', icon: '📱', duration: 8000 });
          else if (data.sms?.status === 'FAILED') toast.error(`Vé đã lưu nhưng gửi SMS thất bại: ${data.sms.error || 'Vui lòng kiểm tra cấu hình eSMS'}`, { id: 'sms-confirmation', duration: 10000 });
        }
        setLastBookedTripId(selectedTripId);
        
        // Auto Reset Form
        setSelectedRouteId("");
        setPhone("");
        setName("");
        setNotes("");
        setSelectedSeats([]);
        setAdultCount(0);
        setStudentCount(0);
        setIsRoundTrip(false);
        setSelectedReturnSeats([]);
        setIsCustomReturnLocation(false);
        setPickup("");
        setDropoff("");
        setPaymentStatus("UNPAID");
        setPaymentMethod("CASH");
        
        fetch(`/api/trips?routeId=${selectedRouteId}&date=${date}`, { method: 'POST' })
          .then(res => res.json())
          .then(d => d.trips && setTrips(d.trips));
      } else {
        toast.error(data.error || "Lỗi đặt vé");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
    setLoading(false);
  };

  const isSameDay = date === returnDate;
  const singleTripSubtotal = (adultCount * effectivePrices.adultPrice) + (studentCount * effectivePrices.studentPrice);
  const returnTripSubtotal = (adultCount * returnEffectivePrices.adultPrice) + (studentCount * returnEffectivePrices.studentPrice);
  const subtotal = isRoundTrip ? singleTripSubtotal + returnTripSubtotal : singleTripSubtotal;
  const discount = (isRoundTrip && isSameDay) ? (40000 * passengerCount) : 0; // 20k per leg
  const total = subtotal - discount;
  const selectedReturnTrip = returnTrips.find((trip) => trip.id === selectedReturnTripId);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tạo Đơn Đặt Vé</h1>
          <p className={styles.subtitle}>Nhập theo thứ tự cuộc gọi: khách hàng → hành trình → ghế → thanh toán</p>
        </div>
        <BookingAdjustmentLookup />
      </header>
      <div className={styles.flow} aria-label="Quy trình đặt vé">
        <span className={selectedTripId ? styles.flowDone : styles.flowActive}><b>1</b>Chuyến & ghế</span>
        <i />
        <span className={phone && name ? styles.flowDone : selectedTripId ? styles.flowActive : ''}><b>2</b>Khách hàng</span>
        <i />
        <span className={pickup && dropoff ? styles.flowDone : phone && name ? styles.flowActive : ''}><b>3</b>Đón trả</span>
        <i />
        <span className={pickup && dropoff ? styles.flowActive : ''}><b>4</b>Xác nhận</span>
      </div>

      <form id="bookingForm" onSubmit={handleSubmit} className={styles.bookingForm}>
        {/* FAST BOOKING HEADER INDICATOR */}
        {searchParams?.get('tripId') && selectedRouteId && (
          <div style={{ 
            backgroundColor: '#f0fdf4', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            border: '1px solid #bbf7d0', 
            marginBottom: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            gridColumn: 'span 2'
          }}>
            <div style={{ fontSize: '1.5rem' }}>🚌</div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#166534' }}>
                {(() => {
                  const r = routes.find(route => route.id === selectedRouteId);
                  return r ? `${r.origin.toUpperCase()} → ${r.destination.toUpperCase()}` : 'Đang tải tuyến...';
                })()}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#15803d', marginTop: '4px', display: 'flex', gap: '16px', fontWeight: 500 }}>
                <span>⏱️ {(() => {
                    const t = trips.find(trip => trip.id === selectedTripId);
                    return t ? t.time : 'Đang tải giờ...';
                  })()}</span>
                <span>📅 {new Date(date).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: ROUTE SELECTION (Moved to top based on user feedback) */}
        <div 
          className={styles.section} 
          style={searchParams?.get('tripId') ? { 
            gridColumn: 'span 2', 
            backgroundColor: 'transparent', 
            padding: '0', 
            border: 'none',
            boxShadow: 'none'
          } : { 
            gridColumn: 'span 2', 
            backgroundColor: 'var(--bg-base)', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid var(--primary)' 
          }}
        >
          {/* Route selection - Hidden if fast booking from dashboard */}
          {!searchParams?.get('tripId') && (
            <>
              <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', color: 'var(--primary)', paddingBottom: 0 }}>1. CHỌN TUYẾN & CHUYẾN ĐI (Bắt buộc)</h2>
              <div className={styles.formGroup} style={{ marginTop: '8px' }}>
                {selectedRouteId === "" ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {routes.map(r => {
                      return (
                        <button 
                          key={r.id}
                          type="button" 
                          onClick={() => setSelectedRouteId(r.id)}
                          className={styles.btnSecondary} 
                          style={{ 
                            flex: 1, 
                            padding: '16px', 
                            fontSize: '1.1rem', 
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {r.origin.toUpperCase()} → {r.destination.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {(() => {
                        const r = routes.find(route => route.id === selectedRouteId);
                        return r ? `${r.origin.toUpperCase()} → ${r.destination.toUpperCase()}` : '';
                      })()}
                    </div>
                    <button type="button" onClick={() => setSelectedRouteId("")} style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Đổi tuyến khác</button>
                  </div>
                )}
              </div>
            </>
          )}
          
          {!searchParams?.get('tripId') && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', opacity: selectedRouteId ? 1 : 0.5, pointerEvents: selectedRouteId ? 'auto' : 'none' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Ngày đi *</label>
                  <input 
                    type="date" 
                    className={styles.input} 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    disabled={!selectedRouteId}
                  />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }} id="field-trip">
                  <label className={styles.label}>Giờ khởi hành *</label>
                  <div className={styles.departureGrid}>
                    {trips.length === 0 && <div className={styles.noDeparture}>Chưa có lịch chạy trong ngày</div>}
                    {trips.map(trip => {
                      const departed = !tripCanDepart(date, trip.time);
                      const disabled = trip.isFull || departed;
                      return <button key={trip.id} type="button" disabled={disabled} onClick={() => { setSelectedTripId(trip.id); setSelectedSeats([]); }} className={`${styles.departureCard} ${selectedTripId === trip.id ? styles.departureSelected : ''}`}>
                        <strong>{trip.time}</strong><span>{trip.vehicleName}</span><em>{departed ? 'Đã khởi hành' : trip.isFull ? 'Hết chỗ' : `Còn ${trip.available} ghế`}</em>
                      </button>;
                    })}
                  </div>
                  {errors.trip && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '4px' }}>{errors.trip}</div>}
                </div>
              </div>
          )}

          {selectedTripId && (() => {
            const currentTrip = trips.find(t => t.id === selectedTripId);
            if (!currentTrip) return null;
            return (
              <div id="field-seats">
                <SeatMap 
                  vehicleType={currentTrip.vehicleType || 'Limousine'} 
                  bookedSeatsList={currentTrip.bookedSeatsList || []}
                  selectedSeats={selectedSeats}
                  onToggleSeat={(seatId) => {
                    setSelectedSeats(prev => 
                      prev.includes(seatId) ? prev.filter(id => id !== seatId) : [...prev, seatId]
                    );
                  }}
                />
                {errors.seats && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '8px', textAlign: 'center' }}>{errors.seats}</div>}
              </div>
            );
          })()}
        </div>

        {!selectedRouteId && !searchParams?.get('tripId') && (
          <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
            Vui lòng <strong>Chọn Tuyến Đường</strong> ở bước trên để tiếp tục nhập thông tin khách hàng.
          </div>
        )}

        {selectedRouteId && (
          <>
            {/* STEP 2: CUSTOMER INFO */}
            <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Thông tin khách hàng</h2>
          <div className={styles.formGroup} id="field-phone">
            <label className={styles.label}>Số điện thoại *</label>
            <input 
              type="tel" 
              className={styles.input} 
              placeholder="Nhập SĐT..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              ref={phoneInputRef}
              required
            />
            {errors.phone && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '4px' }}>{errors.phone}</div>}
            {isSearchingCustomer && !errors.phone && <small style={{ color: 'var(--primary)' }}>Đang tìm khách quen...</small>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tên khách hàng *</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="Tên khách hàng" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* STEP 3: DETAILS */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Chi tiết dịch vụ</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Số lượng khách</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--primary)' }}>
                {selectedSeats.length === 0 ? 'Vui lòng chọn ghế ở Sơ đồ xe' : `${selectedSeats.length} khách`}
              </span>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Chi tiết Loại vé</label>
            {effectivePrices.holidayApplied && (
              <div style={{ marginBottom: '10px', padding: '8px 12px', background: effectivePrices.adjustMode === 'INCREASE' ? 'linear-gradient(135deg,#fff7ed,#fef3c7)' : 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: `1px solid ${effectivePrices.adjustMode === 'INCREASE' ? '#f59e0b' : '#22c55e'}`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                <span style={{ fontSize: '1.1rem' }}>{effectivePrices.adjustMode === 'INCREASE' ? '🎉' : '🏷️'}</span>
                <span style={{ color: effectivePrices.adjustMode === 'INCREASE' ? '#b45309' : '#15803d' }}>
                  {effectivePrices.holidayName} — Giá {effectivePrices.adjustMode === 'INCREASE' ? 'tăng' : 'giảm'} {effectivePrices.adjustSummary}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Người lớn&nbsp;
                  {effectivePrices.holidayApplied && effectivePrices.adultPrice !== effectivePrices.baseAdult && (
                    <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>
                      {new Intl.NumberFormat('vi-VN').format(effectivePrices.baseAdult)}đ
                    </span>
                  )}
                  <strong style={{ color: effectivePrices.adjustMode === 'INCREASE' ? '#dc2626' : effectivePrices.holidayApplied ? '#16a34a' : 'inherit' }}>
                    {new Intl.NumberFormat('vi-VN').format(effectivePrices.adultPrice)}đ
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button" className={styles.btnSecondary} style={{ padding: '8px' }} onClick={() => { if (adultCount > 0) { setAdultCount(a => a - 1); setStudentCount(s => s + 1); } }}>-</button>
                  <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{adultCount}</span>
                  <button type="button" className={styles.btnSecondary} style={{ padding: '8px' }} onClick={() => { if (studentCount > 0) { setAdultCount(a => a + 1); setStudentCount(s => s - 1); } }}>+</button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Sinh viên&nbsp;
                  {effectivePrices.holidayApplied && effectivePrices.studentPrice !== effectivePrices.baseStudent && (
                    <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>
                      {new Intl.NumberFormat('vi-VN').format(effectivePrices.baseStudent)}đ
                    </span>
                  )}
                  <strong style={{ color: effectivePrices.adjustMode === 'INCREASE' ? '#dc2626' : effectivePrices.holidayApplied ? '#16a34a' : 'inherit' }}>
                    {new Intl.NumberFormat('vi-VN').format(effectivePrices.studentPrice)}đ
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button" className={styles.btnSecondary} style={{ padding: '8px' }} onClick={() => { if (studentCount > 0) { setStudentCount(s => s - 1); setAdultCount(a => a + 1); } }}>-</button>
                  <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{studentCount}</span>
                  <button type="button" className={styles.btnSecondary} style={{ padding: '8px' }} onClick={() => { if (adultCount > 0) { setStudentCount(s => s + 1); setAdultCount(a => a - 1); } }}>+</button>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
            <input 
              type="checkbox" 
              id="roundTrip" 
              checked={isRoundTrip}
              onChange={(e) => setIsRoundTrip(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="roundTrip" className={styles.label} style={{ cursor: 'pointer', color: 'var(--text-main)', userSelect: 'none' }}>
              Đặt chiều về (Khứ hồi trong cùng ngày giảm 20.000đ/khách/chiều)
            </label>
          </div>

          {isRoundTrip && (
            <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-base)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--primary)', fontWeight: '600' }}>Cấu hình Chuyến Về</h3>
              
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Ngày về</label>
                  <input type="date" className={styles.input} value={returnDate} onChange={e => setReturnDate(e.target.value)} min={date} />
                </div>
                <div className={styles.formGroup} style={{ flex: 2 }}>
                  <label className={styles.label}>Chuyến xe</label>
                  <select 
                    className={styles.select} 
                    value={selectedReturnTripId} 
                    onChange={e => { setSelectedReturnTripId(e.target.value); setSelectedReturnSeats([]); }}
                  >
                    {returnTrips.length === 0 && <option value="">Không có chuyến</option>}
                    {returnTrips.map(trip => (
                      <option key={trip.id} value={trip.id} disabled={trip.isFull}>
                        {trip.time} — {trip.isFull ? 'HẾT CHỖ' : `Còn ${trip.available} ghế`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedReturnTrip && <div id="field-returnSeats">
                <SeatMap
                  vehicleType={selectedReturnTrip.vehicleType}
                  bookedSeatsList={selectedReturnTrip.bookedSeatsList || []}
                  selectedSeats={selectedReturnSeats}
                  onToggleSeat={(seatId) => setSelectedReturnSeats((current) => current.includes(seatId) ? current.filter((seat) => seat !== seatId) : current.length < selectedSeats.length ? [...current, seatId] : current)}
                />
                {errors.returnSeats && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '6px' }}>{errors.returnSeats}</div>}
              </div>}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="customReturnLoc" 
                  checked={isCustomReturnLocation}
                  onChange={(e) => setIsCustomReturnLocation(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="customReturnLoc" className={styles.label} style={{ cursor: 'pointer', color: 'var(--text-main)', userSelect: 'none' }}>
                  Đón/trả chiều về khác với chiều đi
                </label>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <LocationAutocomplete 
                    label="Điểm đón (Về)"
                    value={isCustomReturnLocation ? returnPickup : dropoff}
                    onChange={(val: string) => isCustomReturnLocation && setReturnPickup(val)}
                    placeholder="Nhập điểm đón..."
                    cityContext={routes.find(r => r.id === returnRouteId)?.origin}
                    disabled={!isCustomReturnLocation}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <LocationAutocomplete 
                    label="Điểm trả (Về)"
                    value={isCustomReturnLocation ? returnDropoff : pickup}
                    onChange={(val: string) => isCustomReturnLocation && setReturnDropoff(val)}
                    placeholder="Nhập điểm trả..."
                    cityContext={routes.find(r => r.id === returnRouteId)?.destination}
                    disabled={!isCustomReturnLocation}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 4: PICKUP / DROPOFF */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Đón / Trả</h2>
          <div style={{ marginBottom: '16px' }} id="field-pickup">
            <LocationAutocomplete 
              label="Điểm đón"
              value={pickup}
              onChange={(val: string) => { setPickup(val); setErrors(prev => ({...prev, pickup: ''})); }}
              placeholder="Tìm địa chỉ đón (VD: Sân bay Chu Lai)"
              cityContext={routes.find(r => r.id === selectedRouteId)?.origin}
            />
            {errors.pickup && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '4px' }}>{errors.pickup}</div>}
          </div>
          <div id="field-dropoff">
            <LocationAutocomplete 
              label="Điểm trả"
              value={dropoff}
              onChange={(val: string) => { setDropoff(val); setErrors(prev => ({...prev, dropoff: ''})); }}
              placeholder="Tìm địa chỉ trả (VD: Bến xe Đà Nẵng)"
              cityContext={routes.find(r => r.id === selectedRouteId)?.destination}
            />
            {errors.dropoff && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '4px' }}>{errors.dropoff}</div>}
          </div>
        </div>
        
        {/* STEP 5: PAYMENT & NOTES */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Thanh toán & Ghi chú</h2>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Trạng thái TT</label>
              <select className={styles.select} value={paymentStatus} onChange={e => {
                const nextStatus = e.target.value;
                setPaymentStatus(nextStatus);
                setPaymentMethod(nextStatus === 'PAID' ? 'TRANSFER' : 'CASH');
              }}>
                <option value="UNPAID">Chưa thanh toán</option>
                <option value="PAID">Đã thanh toán đủ</option>
              </select>
              <small className={styles.fieldHint}>{paymentStatus === 'PAID' ? 'Xác nhận chỉ khi tiền đã vào tài khoản.' : 'Tiền vé sẽ được thu khi khách lên xe.'}</small>
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Phương thức TT</label>
              <div className={`${styles.paymentMethod} ${paymentStatus === 'PAID' ? styles.paymentTransfer : styles.paymentCash}`}>
                <span>{paymentStatus === 'PAID' ? '⇄' : '₫'}</span>
                <div><strong>{paymentStatus === 'PAID' ? 'Chuyển khoản' : 'Tiền mặt'}</strong><small>{paymentStatus === 'PAID' ? 'Đã nhận đủ tiền vé' : 'Thu tiền khi lên xe'}</small></div>
              </div>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Ghi chú thêm</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="VD: Khách say xe ngồi đầu..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className={styles.formGroup} style={{ marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}>
              <input 
                type="checkbox" 
                checked={sendSms} 
                onChange={(e) => setSendSms(e.target.checked)} 
                style={{ width: '16px', height: '16px', accentColor: '#0b8f55' }}
              />
              Gửi SMS xác nhận qua eSMS cho khách hàng
            </label>
          </div>
        </div>

        {/* SUMMARY & SUBMIT */}
        <div className={styles.summary}>
          <div>
            <span className={styles.summaryLabel}>Tóm tắt đơn vé</span>
            <h3>Tổng thanh toán</h3>
            <div className={styles.summaryTotal}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
            </div>
            <small>{selectedSeats.length} ghế · {isRoundTrip ? 'Khứ hồi' : 'Một chiều'}{discount > 0 ? ` · Đã giảm ${new Intl.NumberFormat('vi-VN').format(discount)}đ` : ''}</small>
          </div>
          <div className={styles.btnGroup} style={{ alignSelf: 'center' }}>
            <button type="button" className={styles.btnSecondary} onClick={() => window.location.reload()}>Làm mới</button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? "Đang xử lý..." : "Xác nhận & Lưu"}
            </button>
          </div>
        </div>
        </>
        )}
      </form>
    </div>
  );
}

export default function BookingPage() {
  return <Suspense fallback={<div>�ang t?i...</div>}><BookingPageContent /></Suspense>;
}

