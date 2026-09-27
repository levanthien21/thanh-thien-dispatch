"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import { BarChart3, Bell, CarFront, Clock, Contact, LayoutDashboard, LogOut, MessageSquare, Package, PanelLeftClose, PanelLeftOpen, ScrollText, Search, Settings, ShieldCheck, Ticket, UserCircle, Users } from 'lucide-react';
import { canManageFleet, canManageSystem } from '@/lib/access';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import styles from './Sidebar.module.css';

type NavItem = { name: string; href: string; icon: ComponentType<{ className?: string }>; exact?: boolean };
const MAIN_NAV: NavItem[] = [
  { name: 'Tổng quan', href: '/', icon: LayoutDashboard, exact: true },
  { name: 'Đặt vé', href: '/booking', icon: Ticket },
  { name: 'Khách hàng', href: '/customers', icon: Users },
  { name: 'Ký gửi', href: '/parcels', icon: Package },
  { name: 'Lịch sử đặt vé', href: '/search', icon: Search },
  { name: 'Thông báo', href: '/notifications', icon: Bell },
  { name: 'Báo cáo', href: '/reports', icon: BarChart3 },
];
const FLEET_NAV: NavItem[] = [
  { name: 'Tài xế', href: '/drivers', icon: Contact },
  { name: 'Phương tiện', href: '/vehicles', icon: CarFront },
];
const ADMIN_NAV: NavItem[] = [
  { name: 'Tổng quan cài đặt', href: '/settings', icon: Settings, exact: true },
  { name: 'Giá vé & ngày lễ', href: '/settings/prices', icon: Ticket },
  { name: 'Giờ chạy & tuyến', href: '/settings/schedules', icon: Clock },
  { name: 'SMS / Zalo ZNS', href: '/settings/sms', icon: MessageSquare },
  { name: 'Tài khoản & phân quyền', href: '/settings/accounts', icon: ShieldCheck },
  { name: 'Nhật ký hoạt động', href: '/settings/audit', icon: ScrollText },
];

const active = (path: string, item: NavItem) => item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);

export default function Sidebar({ open = false, onClose, collapsed = false, onToggle }: { open?: boolean; onClose?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  useEffect(() => { fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user || null)); }, []);

  const renderNav = (items: NavItem[]) => <nav className={styles.nav}>{items.map((item) => {
    const Icon = item.icon;
    return <Link key={item.href} href={item.href} title={collapsed ? item.name : undefined} onClick={onClose} aria-current={active(pathname, item) ? 'page' : undefined} className={`${styles.navItem} ${active(pathname, item) ? styles.navItemActive : ''}`}><Icon className={styles.icon} /><span className={styles.navText}>{item.name}</span></Link>;
  })}</nav>;

  return <aside className={`${styles.sidebar} ${open ? styles.open : ''} ${collapsed ? styles.collapsed : ''}`}>
    <div className={styles.brand}><div className={styles.logoContainer}><div className={styles.textLogo}><span className={styles.textLogoT1}>T</span><span className={styles.textLogoT2}>T</span></div><div className={styles.logoText}><h1>THANH THIỆN</h1><p className={styles.hotline}>HOTLINE: 0867 75 79 75</p></div></div><button type="button" className={styles.collapseButton} onClick={onToggle} title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button></div>
    <div className={styles.menuScroll}>
      <p className={styles.groupLabel}>Vận hành</p>{renderNav(MAIN_NAV)}
      {canManageFleet(user?.role) && <><div className={styles.divider} /><p className={styles.groupLabel}>Quản lý danh mục</p>{renderNav(FLEET_NAV)}</>}
      {canManageSystem(user?.role) && <><div className={styles.divider} /><p className={styles.groupLabel}>Quản trị hệ thống</p>{renderNav(ADMIN_NAV)}</>}
    </div>
    <nav className={styles.bottomNav}>
      {user && <div className={styles.userCard} title={collapsed ? user.name : undefined}><span className={styles.avatar}>{user.name.trim().charAt(0)}</span><div><strong>{user.name}</strong><span>{user.role === 'ADMIN' ? 'Quản trị viên' : user.role === 'DISPATCHER' ? 'Điều hành' : 'Tổng đài viên'}</span></div></div>}
      <Link href="/profile" title={collapsed ? 'Hồ sơ cá nhân' : undefined} onClick={onClose} className={`${styles.navItem} ${active(pathname, { name: '', href: '/profile', icon: UserCircle }) ? styles.navItemActive : ''}`}><UserCircle className={styles.icon} /><span className={styles.navText}>Hồ sơ cá nhân</span></Link>
      <ThemeToggle />
      <button type="button" title={collapsed ? 'Đăng xuất' : undefined} className={styles.navItem} onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.replace('/login'); router.refresh(); }}><LogOut className={styles.icon} /><span className={styles.navText}>Đăng xuất</span></button>
    </nav>
  </aside>;
}
