import { prisma } from '@/lib/prisma';
import settingsStyles from "./settings.module.css";
import { MessageSquare, PhoneCall, DollarSign, Clock, ChevronRight, Car, Users, UserCog, ScrollText } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { id: 'asc' } });
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });

  const settingsCards = [
    { title: "Cấu hình SMS & Zalo ZNS", desc: "Quản lý mẫu tin nhắn tự động và lịch sử gửi tin cho khách hàng.", link: "/settings/sms", icon: MessageSquare, color: "#3b82f6" },
    { title: "Cuộc gọi & Tổng đài AI", desc: "Thiết lập kịch bản tổng đài và xem lịch sử cuộc gọi.", link: "/calls", icon: PhoneCall, color: "#10b981" },
    { title: "Cài Đặt Giá Vé", desc: "Điều chỉnh giá vé cơ bản theo tuyến và cấu hình cho các dịp lễ Tết.", link: "/settings/prices", icon: DollarSign, color: "#f59e0b" },
    { title: "Cài Đặt Giờ Chạy Xe", desc: "Thêm, sửa, xóa hoặc bật/tắt lịch trình khởi hành theo từng tuyến.", link: "/settings/schedules", icon: Clock, color: "#8b5cf6" },
    { title: "Tài khoản & Phân quyền", desc: "Tạo tài khoản nhân viên, gán vai trò và khóa quyền truy cập.", link: "/settings/accounts", icon: UserCog, color: "#ec4899" },
    { title: "Nhật ký hoạt động", desc: "Theo dõi các thao tác đặt vé, đối soát và quản trị tài khoản.", link: "/settings/audit", icon: ScrollText, color: "#64748b" },
  ];

  return (
    <div className={settingsStyles.page}>
      <style>{`
        .settings-card {
          display: flex;
          align-items: center;
          padding: 24px;
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          color: inherit;
        }
        .settings-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--primary);
          transform: translateY(-2px);
        }
        .icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          margin-right: 20px;
          flex-shrink: 0;
        }
        .chevron {
          color: var(--text-muted);
          transition: transform 0.2s;
        }
        .settings-card:hover .chevron {
          transform: translateX(4px);
          color: var(--primary);
        }
      `}</style>

      {/* Header */}
      <div className={settingsStyles.header}>
        <span className={settingsStyles.eyebrow}>Dành cho quản trị viên</span>
        <h1>Cài đặt hệ thống</h1>
        <p>Quản lý cấu hình cốt lõi, cước phí và dịch vụ tự động của tổng đài.</p>
      </div>

      {/* Settings Grid */}
      <div className={settingsStyles.settingsGrid}>
        {settingsCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.link} href={item.link} className="settings-card">
              <div className="icon-container" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{item.title}</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
              <div style={{ marginLeft: '16px' }}>
                <ChevronRight className="chevron" size={20} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tables Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px' }}>
        
        {/* Vehicles */}
        <div style={{ backgroundColor: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', backgroundColor: 'var(--bg-base)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                <Car size={20} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Danh mục Xe</h2>
            </div>
            <Link href="/vehicles" className={settingsStyles.manageLink}>Quản lý {vehicles.length} xe →</Link>
          </div>
          <div style={{ padding: '0 24px 24px', overflowX: 'auto' }}>
            <table className={settingsStyles.table} style={{ marginTop: '12px', minWidth: '400px' }}>
              <thead>
                <tr>
                  <th style={{ paddingTop: '16px' }}>Biển số</th>
                  <th style={{ paddingTop: '16px' }}>Loại xe</th>
                  <th style={{ paddingTop: '16px' }}>Ghế</th>
                  <th style={{ paddingTop: '16px', textAlign: 'right' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{v.plateNumber}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{v.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{v.seatCapacity}</td>
                    <td style={{ textAlign: 'right' }}><span className={settingsStyles.badgeActive}>Hoạt động</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users */}
        <div style={{ backgroundColor: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', backgroundColor: 'var(--bg-base)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                <Users size={20} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Tài khoản Nhân viên</h2>
            </div>
            <Link href="/settings/accounts" className={settingsStyles.manageLink}>Quản lý {users.length} tài khoản →</Link>
          </div>
          <div style={{ padding: '0 24px 24px', overflowX: 'auto' }}>
            <table className={settingsStyles.table} style={{ marginTop: '12px', minWidth: '400px' }}>
              <thead>
                <tr>
                  <th style={{ paddingTop: '16px' }}>Họ tên</th>
                  <th style={{ paddingTop: '16px' }}>SĐT Đăng nhập</th>
                  <th style={{ paddingTop: '16px', textAlign: 'right' }}>Quyền hạn</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.9rem' }}>{u.phone}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={u.role === 'ADMIN' ? settingsStyles.badgeAdmin : settingsStyles.badgeAgent}>
                        {u.role === 'ADMIN' ? 'Quản trị' : 'Tổng đài viên'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
