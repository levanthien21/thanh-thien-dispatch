"use client";

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import styles from '../admin.module.css';

type User = { id: string; name: string; phone: string; email: string | null; role: string; status: string };

export default function AccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const load = useCallback(() => fetch('/api/users').then((r) => r.json()).then((d) => setUsers(d.users || [])), []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    const form = event.currentTarget;
    const response = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json().catch(() => ({}));
    setMessage({ text: response.ok ? 'Đã tạo tài khoản' : data.error || 'Không thể tạo tài khoản', error: !response.ok });
    if (response.ok) { form.reset(); await load(); }
  }

  async function update(user: User, patch: Record<string, string>) {
    const response = await fetch(`/api/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const data = await response.json().catch(() => ({}));
    setMessage({ text: response.ok ? 'Đã cập nhật tài khoản' : data.error || 'Không thể cập nhật', error: !response.ok });
    if (response.ok) await load();
  }

  return <div className={styles.page}>
    <header><h1>Quản lý tài khoản</h1><p>Tạo nhân viên, gán vai trò và khóa quyền truy cập.</p></header>
    <section className={styles.panel}>
      <h2>Thêm tài khoản</h2>
      <form className={styles.form} onSubmit={create}>
        <label className={styles.field}>Họ tên<input className={styles.input} name="name" required /></label>
        <label className={styles.field}>Số điện thoại<input className={styles.input} name="phone" required inputMode="numeric" /></label>
        <label className={styles.field}>Email<input className={styles.input} name="email" type="email" /></label>
        <label className={styles.field}>Vai trò<select className={styles.input} name="role" defaultValue="AGENT"><option value="AGENT">Tổng đài viên</option><option value="DISPATCHER">Điều hành</option><option value="ADMIN">Quản trị</option></select></label>
        <label className={styles.field}>Mật khẩu ban đầu<input className={styles.input} name="password" type="password" minLength={10} required /></label>
        <button className={styles.button}>Tạo tài khoản</button>
      </form>
      {message && <p className={message.error ? styles.error : styles.success}>{message.text}</p>}
    </section>
    <section className={styles.panel}>
      <table className={styles.table}><thead><tr><th>Nhân viên</th><th>Điện thoại</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
        {users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><br />{user.email || ''}</td><td>{user.phone}</td><td><select className={styles.input} value={user.role} onChange={(e) => void update(user, { role: e.target.value })}><option value="AGENT">Tổng đài viên</option><option value="DISPATCHER">Điều hành</option><option value="ADMIN">Quản trị</option></select></td><td className={user.status === 'ACTIVE' ? styles.active : styles.inactive}>{user.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}</td><td><button className={`${styles.secondary} ${user.status === 'ACTIVE' ? styles.danger : ''}`} onClick={() => void update(user, { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{user.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}</button></td></tr>)}
      </tbody></table>
    </section>
  </div>;
}
