"use client";

import { ToastBar, Toaster, toast } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { X } from 'lucide-react';
import styles from './AppToaster.module.css';

export default function AppToaster() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  return <Toaster position="top-right" containerStyle={{ top: 84, right: 16 }} gutter={10} toastOptions={{
    duration: 3200,
    style: {
      color: dark ? '#f1f6fb' : '#0f172a',
      background: dark ? '#142a43' : '#ffffff',
      border: `1px solid ${dark ? '#36516c' : '#dfe7f0'}`,
      borderRadius: '12px',
      boxShadow: dark ? '0 18px 42px rgba(0,0,0,.3)' : '0 12px 30px rgba(15,42,70,.12)',
      width: '330px',
      maxWidth: 'calc(100vw - 32px)',
      padding: '0',
      overflow: 'hidden',
    },
    success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
    error: { duration: 4500, iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
  }}>{(item) => <ToastBar toast={item}>{({ icon, message }) => <div className={`${styles.toast} ${styles[item.type] || ''}`}>
    <div className={styles.icon}>{icon}</div>
    <div className={styles.copy}><strong>{item.type === 'success' ? 'Thành công' : item.type === 'error' ? 'Có lỗi xảy ra' : 'Thông báo'}</strong><div>{message}</div></div>
    <button type="button" onClick={() => toast.dismiss(item.id)} aria-label="Đóng thông báo"><X /></button>
  </div>}</ToastBar>}</Toaster>;
}
