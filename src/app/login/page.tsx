"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/setup').then((response) => response.json()).then((data) => setNeedsSetup(Boolean(data.needsSetup)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch(needsSetup ? '/api/auth/setup' : '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Không thể đăng nhập');
      if (data.needsSetup) setNeedsSetup(true);
      setLoading(false);
      return;
    }
    router.replace(new URLSearchParams(window.location.search).get('next') || '/');
    router.refresh();
  }

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.logo}>THANH THIỆN</div>
        <p className={styles.subtitle}>{needsSetup ? 'Khởi tạo tài khoản quản trị đầu tiên' : 'Đăng nhập hệ thống điều hành'}</p>
        <form className={styles.form} onSubmit={submit}>
          {needsSetup && <label className={styles.field}>Họ tên<input className={styles.input} name="name" required minLength={2} autoComplete="name" /></label>}
          <label className={styles.field}>Số điện thoại<input className={styles.input} name="phone" required inputMode="numeric" autoComplete="username" /></label>
          <label className={styles.field}>Mật khẩu<input className={styles.input} name="password" type="password" required minLength={10} autoComplete={needsSetup ? 'new-password' : 'current-password'} /></label>
          {error && <div className={styles.error}>{error}</div>}
          <button className={styles.button} disabled={loading}>{loading ? 'Đang xử lý…' : needsSetup ? 'Khởi tạo hệ thống' : 'Đăng nhập'}</button>
        </form>
        {needsSetup && <p className={styles.hint}>Mật khẩu cần tối thiểu 10 ký tự, có ít nhất một chữ và một số. Tài khoản này sẽ có quyền quản trị.</p>}
      </section>
    </div>
  );
}
