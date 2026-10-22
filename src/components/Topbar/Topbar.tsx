"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Headphones, Menu, Moon, Plus, Search, Sun, PhoneCall } from 'lucide-react';
import { useTheme } from 'next-themes';
import NotificationBell from '@/components/NotificationBell/NotificationBell';
import { useSip } from '@/lib/sip/use-sip';
import styles from './Topbar.module.css';

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const { resolvedTheme, setTheme } = useTheme();
  const { connectionStatus, callState } = useSip();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.altKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        router.push('/booking');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  };

  const getSipStatusText = () => {
    if (callState === 'active' || callState === 'held') return 'Đang đàm thoại';
    if (callState === 'incoming_ringing') return 'Đang đổ chuông...';
    if (connectionStatus === 'registered') return 'Viettel SIP Sẵn sàng';
    if (connectionStatus === 'connecting') return 'Đang kết nối...';
    return 'Hệ thống sẵn sàng';
  };

  const getStatusColor = () => {
    if (callState === 'active' || callState === 'incoming_ringing') return '#0284c7';
    if (connectionStatus === 'registered') return '#10b981';
    if (connectionStatus === 'connecting') return '#f59e0b';
    return '#10b981';
  };

  return (
    <header className={styles.topbar}>
      <button className={styles.menu} type="button" onClick={onMenu} aria-label="Mở menu"><Menu /></button>
      
      <Link href="/calls" className={styles.shift} style={{ textDecoration: 'none', color: 'inherit' }} title="Mở Bàn Trực Tổng Đài">
        <span className={styles.shiftIcon}>
          {callState === 'active' || callState === 'incoming_ringing' ? <PhoneCall size={18} /> : <Headphones size={18} />}
        </span>
        <span>
          <strong>Bàn tổng đài</strong>
          <small>
            <i style={{ backgroundColor: getStatusColor(), boxShadow: `0 0 0 3px ${getStatusColor()}25` }} /> 
            {getSipStatusText()}
          </small>
        </span>
      </Link>

      <form className={styles.search} onSubmit={submit} role="search">
        <Search size={18} />
        <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="SĐT, tên khách hoặc mã vé..." aria-label="Tìm khách hàng hoặc vé" />
        <kbd>/</kbd>
      </form>
      <NotificationBell />
      <button className={styles.theme} type="button" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label="Chuyển giao diện sáng tối" title="Chuyển giao diện sáng/tối">{resolvedTheme === 'dark' ? <Sun /> : <Moon />}</button>
      <Link className={styles.newBooking} href="/booking"><Plus size={18} /><span>Đặt vé nhanh</span><kbd>Alt B</kbd></Link>
    </header>
  );
}
