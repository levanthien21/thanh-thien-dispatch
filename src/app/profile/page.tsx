"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../settings/admin.module.css';

type User = { name: string; phone: string; role: string };

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => { fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user || null)); }, []);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (values.newPassword !== values.confirmPassword) { setMessage({ text: 'Xác nhận mật khẩu không khớp', error: true }); return; }
    const response = await fetch('/api/profile/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await response.json().catch(() => ({}));
    setMessage({ text: response.ok ? 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.' : data.error || 'Không thể đổi mật khẩu', error: !response.ok });
    if (response.ok) setTimeout(() => { router.replace('/login'); router.refresh(); }, 1200);
  }

  return <div className={styles.page}>
    <header><h1>Tài khoản cá nhân</h1><p>Thông tin phiên đăng nhập và bảo mật mật khẩu.</p></header>
    <section className={styles.panel}><h2>{user?.name || 'Đang tải…'}</h2><p>Số điện thoại: {user?.phone}</p><p>Vai trò: {user?.role}</p></section>
    <section className={styles.panel}><h2>Đổi mật khẩu</h2><form className={styles.form} onSubmit={changePassword}>
      <label className={styles.field}>Mật khẩu hiện tại<input className={styles.input} name="currentPassword" type="password" required /></label>
      <label className={styles.field}>Mật khẩu mới<input className={styles.input} name="newPassword" type="password" minLength={10} required /></label>
      <label className={styles.field}>Nhập lại mật khẩu<input className={styles.input} name="confirmPassword" type="password" minLength={10} required /></label>
      <button className={styles.button}>Đổi mật khẩu</button>
    </form>{message && <p className={message.error ? styles.error : styles.success}>{message.text}</p>}</section>
  </div>;
}
