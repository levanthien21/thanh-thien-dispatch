"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSip } from "@/lib/sip/use-sip";
import { 
  Phone, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneOff, 
  Sparkles, 
  Clock, 
  User, 
  Ticket, 
  MapPin, 
  Star, 
  Settings, 
  Mic, 
  MicOff, 
  Pause, 
  Play,
  RotateCcw
} from "lucide-react";
import styles from "../booking/page.module.css"; 
import callStyles from "./calls.module.css";
import toast from "react-hot-toast";

const SAMPLE_CONVERSATION = [
  { role: "assistant", text: "Dạ tổng đài nhà xe Thanh Thiện xin nghe ạ." },
  { role: "user", text: "Alo, cho mình đặt 1 vé từ Chu Lai ra Đà Nẵng chuyến 15h chiều nay nhé." },
  { role: "assistant", text: "Dạ 15h chiều nay tuyến Chu Lai đi Đà Nẵng, anh đi 1 người đúng không ạ?" },
  { role: "user", text: "Đúng rồi, mình tên Hùng, số 0912345678, đón ở Sân bay Chu Lai nhé." },
  { role: "assistant", text: "Dạ vâng anh Hùng, em đã lên lịch, xe sẽ đón anh ở Sân bay Chu Lai lúc 15h." }
];

export default function CallsPage() {
  const { 
    connectionStatus, 
    callState, 
    currentCall, 
    recentLogs,
    makeCall, 
    answerCall, 
    hangupCall, 
    rejectCall, 
    toggleMute, 
    toggleHold, 
    simulateIncomingCall, 
    config 
  } = useSip();

  const router = useRouter();
  const [dbCalls, setDbCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [dialInput, setDialInput] = useState("");
  const [transcript, setTranscript] = useState<{role: string, text: string}[]>([]);
  const [extractedData, setExtractedData] = useState({
    name: "",
    phone: "",
    route: "",
    time: "",
    pickup: "",
    pax: 1
  });
  const [simulating, setSimulating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load call history from backend
  const loadCalls = async () => {
    try {
      const res = await fetch('/api/calls');
      if (res.ok) {
        const data = await res.json();
        setDbCalls(data.calls || []);
      }
    } catch (e) {
      console.warn('Failed to load call history', e);
    } finally {
      setLoadingCalls(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, [callState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // When a call comes in or is active, prefill extracted data
  useEffect(() => {
    if (currentCall) {
      setExtractedData(prev => ({
        ...prev,
        phone: currentCall.phoneNumber,
        name: currentCall.customer?.name || prev.name,
        pickup: currentCall.customer?.lastPickupLocation || prev.pickup
      }));
    }
  }, [currentCall]);

  const startSimulation = () => {
    setTranscript([]);
    setExtractedData({ name: "", phone: "", route: "", time: "", pickup: "", pax: 1 });
    setSimulating(true);

    // Also trigger actual softphone incoming call!
    simulateIncomingCall('0912345678', 'Nguyễn Văn Hùng');

    let step = 0;
    const interval = setInterval(() => {
      setTranscript(prev => [...prev, SAMPLE_CONVERSATION[step]]);
      
      if (step === 1) {
        setExtractedData(prev => ({ ...prev, route: "Chu Lai → Đà Nẵng", time: "15:00", pax: 1 }));
      }
      if (step === 3) {
        setExtractedData(prev => ({ ...prev, name: "Nguyễn Văn Hùng", phone: "0912345678", pickup: "Sân bay Chu Lai" }));
      }

      step++;
      if (step >= SAMPLE_CONVERSATION.length) {
        clearInterval(interval);
        setSimulating(false);
      }
    }, 1800);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleQuickBooking = (phoneToUse: string, nameToUse?: string, pickupToUse?: string) => {
    const query = new URLSearchParams();
    if (phoneToUse) query.set('phone', phoneToUse);
    if (nameToUse && nameToUse !== 'Khách hàng mới') query.set('name', nameToUse);
    if (pickupToUse) query.set('pickup', pickupToUse);
    router.push(`/booking?${query.toString()}`);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Hạ tầng Viettel SIP Trunking Mobile
          </span>
          <h1 className={styles.title}>Bàn Trực Tổng Đài & Quản Lý Cuộc Gọi</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Hotline: <strong>{config.hotline || '0867 75 79 75'}</strong> • Trạng thái: {' '}
            <span style={{ color: connectionStatus === 'registered' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
              {connectionStatus === 'registered' ? 'Đã kết nối Viettel' : 'Đang kết nối...'}
            </span>
          </p>
        </div>

        <div className={styles.btnGroup}>
          <button 
            className={styles.btnSecondary} 
            onClick={() => router.push('/settings/sip')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Settings size={16} /> Cấu hình SIP
          </button>
          <button 
            className={styles.btnPrimary} 
            onClick={startSimulation} 
            disabled={simulating}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Sparkles size={16} />
            {simulating ? "Đang đàm thoại..." : "Thử cuộc gọi mẫu"}
          </button>
        </div>
      </header>

      {/* Live Call Controller Banner (if active) */}
      {currentCall && (
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.3)',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
              width: 52, 
              height: 52, 
              borderRadius: '50%', 
              background: '#ffffff', 
              color: '#0284c7', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <PhoneCall size={26} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                {callState === 'incoming_ringing' ? '🔔 Cuộc gọi đến...' : 
                 callState === 'outgoing_calling' ? 'Đang quay số...' : 'Đang đàm thoại'}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {currentCall.customer?.name ? `${currentCall.customer.name} (${currentCall.phoneNumber})` : currentCall.phoneNumber}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                Thời gian: <strong>{formatDuration(currentCall.durationSeconds)}</strong> • {currentCall.isHeld ? 'Đang giữ máy' : 'Đang nói'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {callState === 'incoming_ringing' ? (
              <>
                <button
                  type="button"
                  onClick={rejectCall}
                  style={{ padding: '10px 18px', borderRadius: 10, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  onClick={answerCall}
                  style={{ padding: '10px 20px', borderRadius: 10, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Bắt máy
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleMute}
                  style={{ padding: '10px 14px', borderRadius: 10, background: currentCall.isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {currentCall.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  <span>{currentCall.isMuted ? 'Mở Mic' : 'Tắt Mic'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleHold}
                  style={{ padding: '10px 14px', borderRadius: 10, background: currentCall.isHeld ? '#f59e0b' : 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {currentCall.isHeld ? <Play size={16} /> : <Pause size={16} />}
                  <span>{currentCall.isHeld ? 'Tiếp tục' : 'Giữ máy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickBooking(currentCall.phoneNumber, currentCall.customer?.name, currentCall.customer?.lastPickupLocation)}
                  style={{ padding: '10px 16px', borderRadius: 10, background: '#ffffff', color: '#0284c7', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Ticket size={16} />
                  <span>Tạo vé ngay</span>
                </button>
                <button
                  type="button"
                  onClick={() => hangupCall()}
                  style={{ padding: '10px 16px', borderRadius: 10, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <PhoneOff size={16} />
                  <span>Gác máy</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Split Pane for Live Assistant & Dialing / Info */}
      <div className={callStyles.splitPane} style={{ marginBottom: 32 }}>
        
        {/* Left Pane: Live Transcript & AI Audio */}
        <div className={callStyles.pane}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Hội thoại thời gian thực (Live Audio Transcript)</span>
            {currentCall && <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>● Đang ghi âm</span>}
          </h2>
          
          <div className={callStyles.chatBox}>
            {transcript.length === 0 && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '60px' }}>
                <PhoneCall size={32} style={{ opacity: 0.4, margin: '0 auto 12px', display: 'block' }} />
                <p>Đang ở chế độ sẵn sàng tiếp nhận cuộc gọi...</p>
                <small>Bấm <strong>&quot;Thử cuộc gọi mẫu&quot;</strong> hoặc quay số bên phải để bắt đầu cuộc gọi.</small>
              </div>
            )}
            {transcript.map((msg, idx) => (
              <div key={idx} className={`${callStyles.message} ${msg.role === 'assistant' ? callStyles.assistantMsg : callStyles.userMsg}`}>
                <span className={callStyles.sender}>{msg.role === 'assistant' ? 'Tổng đài viên' : 'Khách hàng'}</span>
                <p>{msg.text}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Right Pane: Customer Details & 1-Click Booking */}
        <div className={callStyles.pane}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Thông tin khách hàng & Phiếu đặt vé</span>
            {extractedData.phone && <span style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 'normal' }}>⚡ Nhận diện khách tự động</span>}
          </h2>
          
          <form className={styles.bookingForm} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tên khách hàng</label>
              <input 
                type="text" 
                className={styles.input} 
                value={extractedData.name} 
                onChange={(e) => setExtractedData({ ...extractedData, name: e.target.value })}
                placeholder="VD: Nguyễn Văn Hùng" 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Số điện thoại</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={extractedData.phone} 
                  onChange={(e) => setExtractedData({ ...extractedData, phone: e.target.value })}
                  placeholder="09xx xxx xxx" 
                />
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => makeCall(extractedData.phone)}
                  disabled={!extractedData.phone}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 16px' }}
                >
                  <Phone size={15} /> Gọi
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Tuyến đường mong muốn</label>
              <input 
                type="text" 
                className={styles.input} 
                value={extractedData.route} 
                onChange={(e) => setExtractedData({ ...extractedData, route: e.target.value })}
                placeholder="Chu Lai → Đà Nẵng" 
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Giờ đi</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={extractedData.time} 
                  onChange={(e) => setExtractedData({ ...extractedData, time: e.target.value })}
                  placeholder="15:00" 
                />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Số lượng khách</label>
                <input 
                  type="number" 
                  className={styles.input} 
                  value={extractedData.pax} 
                  onChange={(e) => setExtractedData({ ...extractedData, pax: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Điểm đón khách</label>
              <input 
                type="text" 
                className={styles.input} 
                value={extractedData.pickup} 
                onChange={(e) => setExtractedData({ ...extractedData, pickup: e.target.value })}
                placeholder="VD: Sân bay Chu Lai" 
              />
            </div>

            <div className={styles.btnGroup} style={{ marginTop: 'auto', paddingTop: 16 }}>
              <button 
                type="button" 
                className={styles.btnPrimary} 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
                disabled={!extractedData.phone}
                onClick={() => handleQuickBooking(extractedData.phone, extractedData.name, extractedData.pickup)}
              >
                <Ticket size={18} />
                <span>Xác nhận & Đi đến Đặt Vé</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Call History Table */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} color="#0284c7" />
            <span>Nhật ký cuộc gọi tổng đài gần đây</span>
          </h2>
          <button 
            type="button" 
            className={styles.btnSecondary} 
            onClick={loadCalls}
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={14} /> Làm mới
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Thời gian</th>
                <th style={{ padding: '12px 16px' }}>Số điện thoại</th>
                <th style={{ padding: '12px 16px' }}>Khách hàng</th>
                <th style={{ padding: '12px 16px' }}>Thời lượng</th>
                <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dbCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Chưa có nhật ký cuộc gọi nào.
                  </td>
                </tr>
              ) : (
                dbCalls.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {new Date(c.startedAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {c.direction === 'outbound' ? (
                          <PhoneOutgoing size={14} color="#0284c7" />
                        ) : (
                          <PhoneIncoming size={14} color="#10b981" />
                        )}
                        <span>{c.callerNumber}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>
                      {c.customerName || 'Khách vãng lai'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {c.duration > 0 ? `${c.duration} giây` : '0 giây'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: c.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: c.status === 'COMPLETED' ? '#10b981' : '#ef4444'
                      }}>
                        {c.status === 'COMPLETED' ? 'Thành công' : 'Nhỡ'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          onClick={() => makeCall(c.callerNumber)}
                          style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Gọi lại cho số này"
                        >
                          <Phone size={13} /> Gọi lại
                        </button>
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={() => handleQuickBooking(c.callerNumber, c.customerName)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Tạo vé cho khách hàng này"
                        >
                          <Ticket size={13} /> Đặt vé
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
