"use client";

import { useSip } from '@/lib/sip/use-sip';
import { useRouter } from 'next/navigation';
import { Phone, PhoneCall, PhoneOff, User, MapPin, Ticket, Star, Sparkles } from 'lucide-react';
import styles from './Softphone.module.css';

export default function IncomingCallModal() {
  const { callState, currentCall, answerCall, rejectCall } = useSip();
  const router = useRouter();

  if (callState !== 'incoming_ringing' || !currentCall) {
    return null;
  }

  const customer = currentCall.customer;
  const callerNumber = currentCall.phoneNumber;

  const handleQuickBooking = () => {
    // 1. Answer the call
    answerCall();

    // 2. Build booking URL query params
    const query = new URLSearchParams();
    query.set('phone', callerNumber);
    if (customer?.name && customer.name !== 'Khách hàng mới') {
      query.set('name', customer.name);
    }
    if (customer?.lastPickupLocation) {
      query.set('pickup', customer.lastPickupLocation);
    }

    // 3. Navigate to booking
    router.push(`/booking?${query.toString()}`);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.incomingCard}>
        {/* Header */}
        <div className={styles.incomingHeader}>
          <div className={styles.carrierBadge}>
            <Sparkles size={12} />
            <span>Viettel SIP Trunking Mobile</span>
          </div>

          <div className={styles.callerAvatar}>
            <PhoneCall size={32} />
          </div>

          <h2 className={styles.callerNumber}>{callerNumber}</h2>
          <p className={styles.callerName}>
            {customer?.name || 'Đang tra cứu danh bạ khách hàng...'}
          </p>
        </div>

        {/* Body with CRM Context */}
        <div className={styles.incomingBody}>
          <div className={styles.crmBox}>
            <div className={styles.crmRow}>
              <span className={styles.crmLabel}>
                <User size={15} /> Khách hàng:
              </span>
              <span className={styles.crmValue}>
                {customer?.name || 'Khách vãng lai'}
                {customer?.isVip && (
                  <span className={styles.vipBadge} style={{ marginLeft: 6 }}>
                    <Star size={11} fill="currentColor" /> VIP
                  </span>
                )}
              </span>
            </div>

            <div className={styles.crmRow}>
              <span className={styles.crmLabel}>
                <Ticket size={15} /> Lịch sử đặt xe:
              </span>
              <span className={styles.crmValue}>
                {customer && customer.bookingsCount > 0 ? (
                  <strong style={{ color: '#0284c7' }}>{customer.bookingsCount} chuyến đã đi</strong>
                ) : (
                  <span style={{ color: '#64748b' }}>Chưa có chuyến nào</span>
                )}
              </span>
            </div>

            {customer?.lastPickupLocation && (
              <div className={styles.crmRow}>
                <span className={styles.crmLabel}>
                  <MapPin size={15} /> Điểm đón quen:
                </span>
                <span className={styles.crmValue} style={{ maxWidth: '200px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={customer.lastPickupLocation}>
                  {customer.lastPickupLocation}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className={styles.actionsGrid}>
            <button 
              type="button" 
              className={`${styles.btnAction} ${styles.btnReject}`}
              onClick={rejectCall}
            >
              <PhoneOff size={18} />
              <span>Từ chối</span>
            </button>

            <button 
              type="button" 
              className={`${styles.btnAction} ${styles.btnAnswer}`}
              onClick={answerCall}
            >
              <Phone size={18} />
              <span>Nghe máy</span>
            </button>
          </div>

          {/* 1-Click Quick Booking button */}
          <button 
            type="button" 
            className={styles.btnQuickBooking}
            onClick={handleQuickBooking}
          >
            <Ticket size={18} />
            <span>Nghe & Mở Màn Hình Đặt Vé</span>
          </button>
        </div>
      </div>
    </div>
  );
}
