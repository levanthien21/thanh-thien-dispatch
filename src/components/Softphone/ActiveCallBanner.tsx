"use client";

import { useSip } from '@/lib/sip/use-sip';
import { useRouter } from 'next/navigation';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  Ticket, 
  User, 
  PhoneOutgoing 
} from 'lucide-react';
import styles from './Softphone.module.css';

export default function ActiveCallBanner() {
  const { callState, currentCall, liveSummary, hangupCall, toggleMute, toggleHold } = useSip();
  const router = useRouter();

  if (!currentCall || (callState !== 'active' && callState !== 'held' && callState !== 'outgoing_calling')) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOpenBooking = () => {
    const query = new URLSearchParams();
    query.set('phone', currentCall.phoneNumber);
    const name = liveSummary?.extractedForm.name || currentCall.customer?.name;
    if (name && name !== 'Khách hàng mới') {
      query.set('name', name);
    }
    const pickup = liveSummary?.extractedForm.pickup || currentCall.customer?.lastPickupLocation;
    if (pickup) {
      query.set('pickup', pickup);
    }
    if (liveSummary?.extractedForm.dropoff) {
      query.set('dropoff', liveSummary.extractedForm.dropoff);
    }
    if (liveSummary?.extractedForm.route) {
      query.set('route', liveSummary.extractedForm.route);
    }
    if (liveSummary?.extractedForm.notes) {
      query.set('notes', liveSummary.extractedForm.notes);
    }
    router.push(`/booking?${query.toString()}`);
  };

  return (
    <div className={styles.activeCallBanner}>
      <div className={styles.activeCallInfo}>
        <div className={styles.activeCallerLine}>
          {currentCall.direction === 'outbound' ? (
            <PhoneOutgoing size={16} color="#0284c7" />
          ) : (
            <User size={16} color="#10b981" />
          )}
          <span>{currentCall.customer?.name || currentCall.phoneNumber}</span>
          {callState === 'outgoing_calling' ? (
            <span className={styles.activeCallTimer} style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
              Đang đổ chuông...
            </span>
          ) : (
            <span className={styles.activeCallTimer}>
              ● REC {formatDuration(currentCall.durationSeconds)}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
          {currentCall.phoneNumber} • {callState === 'held' ? 'Đang giữ máy' : 'Đang ghi âm & tóm tắt tự động'}
        </div>
      </div>

      <div className={styles.activeCallControls}>
        <button
          type="button"
          className={`${styles.iconBtn} ${currentCall.isMuted ? styles.iconBtnActive : ''}`}
          onClick={toggleMute}
          title={currentCall.isMuted ? 'Bật micro' : 'Tắt micro (Mute)'}
        >
          {currentCall.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <button
          type="button"
          className={`${styles.iconBtn} ${currentCall.isHeld ? styles.iconBtnActive : ''}`}
          onClick={toggleHold}
          title={currentCall.isHeld ? 'Tiếp tục cuộc gọi' : 'Giữ máy (Hold)'}
        >
          {currentCall.isHeld ? <Play size={16} /> : <Pause size={16} />}
        </button>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={handleOpenBooking}
          title="Tạo vé từ tóm tắt cuộc gọi"
          style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', borderColor: '#0284c7' }}
        >
          <Ticket size={16} />
        </button>

        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconBtnHangup}`}
          onClick={() => hangupCall()}
          title="Gác máy & Lưu ghi âm"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}
