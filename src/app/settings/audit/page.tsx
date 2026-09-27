"use client";

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';

type Log = { id: string; action: string; entityType: string; entityId: string; beforeData: string | null; afterData: string | null; createdAt: string; user: { name: string; phone: string } };
const ACTIONS: Record<string, string> = { BOOKING_CREATED: 'Tạo vé', BOOKING_UPDATED: 'Cập nhật vé', BOOKING_CANCELLED: 'Hủy vé', TRIP_CASH_RECONCILED: 'Đối soát tiền mặt', USER_CREATED: 'Tạo tài khoản', USER_UPDATED: 'Cập nhật tài khoản', PASSWORD_CHANGED: 'Đổi mật khẩu' };

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  useEffect(() => { fetch('/api/audit-logs?take=200').then((r) => r.json()).then((d) => setLogs(d.logs || [])); }, []);
  return <div className={styles.page}><header><h1>Nhật ký hoạt động</h1><p>200 thao tác quan trọng gần nhất trong hệ thống.</p></header><section className={styles.panel}>
    <table className={styles.table}><thead><tr><th>Thời gian</th><th>Nhân viên</th><th>Thao tác</th><th>Đối tượng</th><th>Thay đổi</th></tr></thead><tbody>
      {logs.map((log) => <tr key={log.id}><td>{new Date(log.createdAt).toLocaleString('vi-VN')}</td><td>{log.user.name}<br />{log.user.phone}</td><td><strong>{ACTIONS[log.action] || log.action}</strong></td><td>{log.entityType}<br />{log.entityId.slice(0, 8)}</td><td className={styles.json} title={log.afterData || ''}>{log.afterData || log.beforeData || '—'}</td></tr>)}
    </tbody></table>
  </section></div>;
}
