"use client";
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, CreditCard, MessageSquare, Route } from 'lucide-react';
import styles from './NotificationBell.module.css';
type Notice = { id: string; type: string; title: string; message: string; priority: string; link: string | null; readAt: string | null; createdAt: string };
const icons = { TRIP: Route, PAYMENT: CreditCard, MESSAGE: MessageSquare } as const;
export default function NotificationBell() {
  const [open, setOpen] = useState(false); const [items, setItems] = useState<Notice[]>([]); const [count, setCount] = useState(0); const root = useRef<HTMLDivElement>(null);
  const load = useCallback(() => fetch('/api/notifications?take=8').then((r) => r.ok ? r.json() : null).then((d) => { if (d) { setItems(d.notifications); setCount(d.unreadCount); } }), []);
  useEffect(() => { void load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  useEffect(() => { const close = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);
  const read = async (id: string) => { await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' }); setItems((all) => all.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)); setCount((n) => Math.max(0, n - 1)); };
  const readAll = async () => { await fetch('/api/notifications', { method: 'PATCH' }); setItems((all) => all.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))); setCount(0); };
  return <div className={styles.root} ref={root}><button className={styles.trigger} onClick={() => setOpen((v) => !v)} aria-label={`Thông báo${count ? `, ${count} chưa đọc` : ''}`}><Bell />{count > 0 && <b>{count > 99 ? '99+' : count}</b>}</button>{open && <div className={styles.popover}><header><div><strong>Thông báo</strong><span>{count} chưa đọc</span></div>{count > 0 && <button onClick={readAll}><CheckCheck />Đọc tất cả</button>}</header><div className={styles.list}>{items.length === 0 ? <div className={styles.empty}><Bell /><strong>Không có thông báo</strong><span>Mọi công việc đang ổn định.</span></div> : items.map((item) => { const Icon = icons[item.type as keyof typeof icons] || AlertTriangle; return <Link href={item.link || '/notifications'} onClick={() => { void read(item.id); setOpen(false); }} className={`${styles.item} ${!item.readAt ? styles.unread : ''}`} key={item.id}><span className={`${styles.itemIcon} ${styles[item.priority.toLowerCase()]}`}><Icon /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></div>{!item.readAt && <i />}</Link>; })}</div><footer><Link href="/notifications" onClick={() => setOpen(false)}>Xem tất cả thông báo →</Link></footer></div>}</div>;
}
