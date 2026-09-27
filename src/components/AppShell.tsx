"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import Topbar from '@/components/Topbar/Topbar';
import styles from '@/app/layout.module.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => { setSidebarCollapsed(localStorage.getItem('tt_sidebar_collapsed') === '1'); }, []);
  const toggleSidebar = () => setSidebarCollapsed((value) => { localStorage.setItem('tt_sidebar_collapsed', value ? '0' : '1'); return !value; });
  if (isLogin) return <main>{children}</main>;
  return (
    <div className={styles.container}>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      {menuOpen && <button className={styles.overlay} aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <div className={`${styles.workspace} ${sidebarCollapsed ? styles.workspaceCollapsed : ''}`}>
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className={styles.mainContent}><div key={pathname} className={styles.pageTransition}>{children}</div></main>
      </div>
    </div>
  );
}
