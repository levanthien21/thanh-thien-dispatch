"use client";

import { useState, useEffect } from 'react';
import { useSip } from '@/lib/sip/use-sip';
import { CallLogItem } from '@/lib/sip/sip-types';
import { 
  Phone, 
  PhoneCall, 
  Delete, 
  X, 
  Sparkles, 
  Settings
} from 'lucide-react';
import Link from 'next/link';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallBanner from './ActiveCallBanner';
import styles from './Softphone.module.css';

const KEYPAD_BUTTONS = [
  { num: '1', letters: '' },
  { num: '2', letters: 'ABC' },
  { num: '3', letters: 'DEF' },
  { num: '4', letters: 'GHI' },
  { num: '5', letters: 'JKL' },
  { num: '6', letters: 'MNO' },
  { num: '7', letters: 'PQRS' },
  { num: '8', letters: 'TUV' },
  { num: '9', letters: 'WXYZ' },
  { num: '*', letters: '' },
  { num: '0', letters: '+' },
  { num: '#', letters: '' },
];

export default function Softphone() {
  const { 
    connectionStatus, 
    currentCall, 
    recentLogs,
    makeCall, 
    sendDtmf, 
    simulateIncomingCall
  } = useSip();

  const [isOpen, setIsOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState('');

  // Global event listener for click-to-call from other components
  useEffect(() => {
    const handleDialEvent = (e: CustomEvent<string> | any) => {
      const number = e.detail;
      if (number) {
        setDialNumber(number);
        setIsOpen(true);
      }
    };

    window.addEventListener('tt-dial', handleDialEvent as EventListener);
    return () => {
      window.removeEventListener('tt-dial', handleDialEvent as EventListener);
    };
  }, []);

  const handleKeyPress = (digit: string) => {
    setDialNumber(prev => prev + digit);
    sendDtmf(digit);
  };

  const handleDelete = () => {
    setDialNumber(prev => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (!dialNumber) return;
    makeCall(dialNumber);
    setIsOpen(false);
  };

  const getStatusBadge = () => {
    if (connectionStatus === 'registered') {
      return (
        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
          <span className={`${styles.statusDot} ${styles.statusDotRegistered}`} style={{ position: 'relative' }} />
          Viettel SIP Online
        </span>
      );
    }
    if (connectionStatus === 'connecting') {
      return (
        <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
          <span className={`${styles.statusDot} ${styles.statusDotConnecting}`} style={{ position: 'relative' }} />
          Đang kết nối...
        </span>
      );
    }
    return (
      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
        <span className={`${styles.statusDot} ${styles.statusDotError}`} style={{ position: 'relative' }} />
        Mất kết nối SIP
      </span>
    );
  };

  return (
    <>
      {/* 1. Modal for Incoming Call with CRM details */}
      <IncomingCallModal />

      {/* 2. Floating Active Call Controls Bar */}
      <ActiveCallBanner />

      {/* 3. Floating Softphone Button (bottom-right) */}
      {!currentCall && (
        <button
          type="button"
          className={styles.floatingTrigger}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Mở bàn phím Softphone"
        >
          <div className={styles.triggerIconWrap}>
            <Phone size={18} />
            <span 
              className={`
                ${styles.statusDot} 
                ${connectionStatus === 'registered' ? styles.statusDotRegistered : 
                  connectionStatus === 'connecting' ? styles.statusDotConnecting : styles.statusDotError}
              `} 
            />
          </div>
          <span>Tổng đài SIP</span>
        </button>
      )}

      {/* 4. Softphone Drawer / Dialpad Popover */}
      {isOpen && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setIsOpen(false)} />
          <div className={styles.softphoneDrawer}>
            {/* Header */}
            <div className={styles.drawerHeader}>
              <div>
                <div className={styles.drawerTitle}>
                  <PhoneCall size={16} color="#0284c7" />
                  <span>Softphone Viettel SIP</span>
                </div>
                {getStatusBadge()}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link 
                  href="/settings/sip" 
                  onClick={() => setIsOpen(false)}
                  style={{ color: 'var(--text-muted, #64748b)', padding: 4 }}
                  title="Cài đặt SIP Viettel"
                >
                  <Settings size={16} />
                </Link>
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Display Input */}
            <div className={dialpadDisplayWrapper}>
              <input
                type="text"
                className={styles.dialInput}
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value.replace(/[^0-9*#+]/g, ''))}
                placeholder="Nhập số điện thoại..."
                autoFocus
              />
              {dialNumber && (
                <button 
                  type="button" 
                  onClick={handleDelete}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6 }}
                >
                  <Delete size={20} />
                </button>
              )}
            </div>

            {/* Keypad Buttons */}
            <div className={styles.keypadGrid}>
              {KEYPAD_BUTTONS.map((item) => (
                <button
                  key={item.num}
                  type="button"
                  className={styles.keyBtn}
                  onClick={() => handleKeyPress(item.num)}
                >
                  <span className={styles.keyNumber}>{item.num}</span>
                  {item.letters && <span className={styles.keyLetters}>{item.letters}</span>}
                </button>
              ))}
            </div>

            {/* Dial Action Buttons */}
            <div className={styles.dialActions}>
              <button
                type="button"
                className={styles.btnCall}
                onClick={handleCall}
                disabled={!dialNumber}
                style={{ opacity: dialNumber ? 1 : 0.6 }}
              >
                <Phone size={18} />
                <span>Gọi đi</span>
              </button>

              <button
                type="button"
                className={styles.btnSimulate}
                onClick={() => {
                  simulateIncomingCall();
                  setIsOpen(false);
                }}
                title="Giả lập cuộc gọi khách hàng tới tổng đài"
              >
                <Sparkles size={16} />
                <span>Mô phỏng gọi tới</span>
              </button>
            </div>

            {/* Quick recent calls preview */}
            {recentLogs.length > 0 && (
              <div style={{ padding: '8px 16px 14px', borderTop: '1px solid var(--border-color, #e2e8f0)', maxHeight: 120, overflowY: 'auto' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', marginBottom: 6 }}>
                  Cuộc gọi gần đây
                </div>
                {recentLogs.slice(0, 3).map((log: CallLogItem) => (
                  <div 
                    key={log.id} 
                    onClick={() => setDialNumber(log.callerNumber)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    <span>{log.customerName || log.callerNumber}</span>
                    <span style={{ color: log.status === 'COMPLETED' ? '#10b981' : '#ef4444', fontSize: '0.75rem' }}>
                      {log.duration > 0 ? `${log.duration}s` : 'Nhỡ'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

const dialpadDisplayWrapper = styles.dialpadDisplay;
