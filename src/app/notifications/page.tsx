"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, Check, CheckCheck, CreditCard, ExternalLink, LoaderCircle, MessageSquare, Route } from 'lucide-react';
import styles from './page.module.css';

type Notice = {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  link: string | null;
  readAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'TRIP', label: 'Chuyến xe' },
  { value: 'PAYMENT', label: 'Thanh toán' },
  { value: 'MESSAGE', label: 'Tin nhắn' },
];

const typeMeta = (type: string) => {
  if (type === 'TRIP') return { label: 'Chuyến xe', icon: Route, tone: styles.blue };
  if (type === 'PAYMENT') return { label: 'Thanh toán', icon: CreditCard, tone: styles.amber };
  if (type === 'MESSAGE') return { label: 'Tin nhắn', icon: MessageSquare, tone: styles.rose };
  return { label: 'Hệ thống', icon: Bell, tone: styles.blue };
};

const relativeTime = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [type, setType] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ take: '100' });
    if (type) params.set('type', type);
    if (unreadOnly) params.set('unread', '1');
    const response = await fetch(`/api/notifications?${params}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
    }
    setLoading(false);
  }, [type, unreadOnly]);

  useEffect(() => { load(); }, [load]);

  const updateOne = async (id: string, resolved = false) => {
    const response = await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resolved ? { resolved: true } : {}),
    });
    if (response.ok) await load();
  };

  const markAllRead = async () => {
    const response = await fetch('/api/notifications', { method: 'PATCH' });
    if (response.ok) await load();
  };

  const unreadCount = items.filter((item) => !item.readAt).length;

  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroIcon}><Bell /></div>
      <div>
        <span className={styles.eyebrow}>TRUNG TÂM VẬN HÀNH</span>
        <h1>Thông báo</h1>
        <p>Theo dõi việc cần xử lý mà không làm gián đoạn thao tác đặt vé.</p>
      </div>
      <div className={styles.summary}>
        <strong>{unreadCount}</strong>
        <span>chưa đọc</span>
      </div>
    </section>

    <section className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {FILTERS.map((filter) => <button key={filter.value} type="button" className={type === filter.value ? styles.activeFilter : ''} onClick={() => setType(filter.value)}>{filter.label}</button>)}
        </div>
        <div className={styles.actions}>
          <label><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} /> Chỉ chưa đọc</label>
          <button type="button" onClick={markAllRead} disabled={!unreadCount}><CheckCheck size={17} /> Đọc tất cả</button>
        </div>
      </div>

      {loading ? <div className={styles.state}><LoaderCircle className={styles.spin} /> Đang cập nhật thông báo...</div> : items.length === 0 ? <div className={styles.empty}>
        <span><Check size={28} /></span><h2>Không có việc cần chú ý</h2><p>Các thông báo mới sẽ xuất hiện tại đây.</p>
      </div> : <div className={styles.list}>
        {items.map((item) => {
          const meta = typeMeta(item.type);
          const Icon = meta.icon;
          return <article key={item.id} className={`${styles.notice} ${!item.readAt ? styles.unread : ''} ${item.resolvedAt ? styles.resolved : ''}`}>
            <div className={`${styles.noticeIcon} ${meta.tone}`}><Icon /></div>
            <div className={styles.content}>
              <div className={styles.noticeMeta}>
                <span>{meta.label}</span>
                {item.priority === 'HIGH' && <em><AlertTriangle size={13} /> Ưu tiên</em>}
                <time>{relativeTime(item.createdAt)}</time>
              </div>
              <h2>{item.title}</h2>
              <p>{item.message}</p>
            </div>
            <div className={styles.noticeActions}>
              {!item.readAt && <button type="button" onClick={() => updateOne(item.id)}><Check size={16} /> Đã đọc</button>}
              {!item.resolvedAt && <button type="button" onClick={() => updateOne(item.id, true)}><CheckCheck size={16} /> Đã xử lý</button>}
              {item.link && <Link href={item.link} onClick={() => { if (!item.readAt) updateOne(item.id); }}>Mở chi tiết <ExternalLink size={15} /></Link>}
            </div>
          </article>;
        })}
      </div>}
    </section>
  </main>;
}
