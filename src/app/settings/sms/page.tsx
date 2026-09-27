"use client";

import { useState, useEffect } from "react";
import styles from "../../booking/page.module.css";
import toast from "react-hot-toast";

export default function SmsSettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TEMPLATES' | 'LOGS'>('TEMPLATES');

  // Edit template state
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tplRes, logRes] = await Promise.all([
        fetch('/api/settings/sms-templates'),
        fetch('/api/settings/sms-logs')
      ]);
      const tpls = await tplRes.json();
      const lgs = await logRes.json();
      setTemplates(tpls);
      setLogs(lgs);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      const res = await fetch('/api/settings/sms-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate.id,
          content: editContent,
          isActive: editIsActive
        })
      });

      if (res.ok) {
        toast.success("Cập nhật mẫu tin nhắn thành công");
        setEditingTemplate(null);
        fetchData();
      } else {
        toast.error("Lỗi khi lưu");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    }
  };

  if (loading) return <div className={styles.container}>Đang tải...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản lý SMS / ZNS</h1>
      </header>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('TEMPLATES')}
          style={{ 
            padding: '8px 16px', 
            background: activeTab === 'TEMPLATES' ? 'var(--primary)' : 'transparent', 
            color: activeTab === 'TEMPLATES' ? 'white' : 'var(--text-main)', 
            border: activeTab === 'TEMPLATES' ? 'none' : '1px solid var(--border-color)', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            fontWeight: 600 
          }}
        >
          Mẫu tin nhắn
        </button>
        <button 
          onClick={() => setActiveTab('LOGS')}
          style={{ 
            padding: '8px 16px', 
            background: activeTab === 'LOGS' ? 'var(--primary)' : 'transparent', 
            color: activeTab === 'LOGS' ? 'white' : 'var(--text-main)', 
            border: activeTab === 'LOGS' ? 'none' : '1px solid var(--border-color)', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            fontWeight: 600 
          }}
        >
          Lịch sử gửi tin
        </button>
      </div>

      {activeTab === 'TEMPLATES' && (
        <div>
          <div style={{ display: 'grid', gap: '16px' }}>
            {templates.map(tpl => (
              <div key={tpl.id} style={{ padding: '24px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{tpl.name}</h3>
                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: tpl.isActive ? '#dcfce3' : '#fee2e2', color: tpl.isActive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {tpl.isActive ? 'Đang kích hoạt' : 'Đang tắt'}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setEditContent(tpl.content);
                      setEditIsActive(tpl.isActive);
                    }}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Chỉnh sửa
                  </button>
                </div>
                
                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '6px', border: '1px solid #e5e7eb', fontFamily: 'monospace', color: '#374151', whiteSpace: 'pre-wrap' }}>
                  {tpl.content}
                </div>

                <div style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <strong>Các biến hỗ trợ:</strong> {'{{name}}'}, {'{{booking_code}}'}, {'{{route}}'}, {'{{time}}'}, {'{{pickup}}'}
                </div>
              </div>
            ))}
          </div>

          {editingTemplate && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'var(--bg-panel)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '600px' }}>
                <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem' }}>Sửa mẫu: {editingTemplate.name}</h2>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nội dung tin nhắn</label>
                  <textarea 
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', minHeight: '120px', fontFamily: 'inherit', fontSize: '0.9rem' }}
                  />
                </div>

                <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Kích hoạt mẫu tin nhắn này</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingTemplate(null)} className={styles.btnSecondary}>Hủy</button>
                  <button onClick={handleSaveTemplate} className={styles.btnPrimary}>Lưu thay đổi</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'LOGS' && (
        <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px' }}>Thời gian</th>
                <th style={{ padding: '16px' }}>SĐT Nhận</th>
                <th style={{ padding: '16px' }}>Khách / Mã vé</th>
                <th style={{ padding: '16px', width: '40%' }}>Nội dung</th>
                <th style={{ padding: '16px' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>Chưa có lịch sử gửi tin</td></tr>
              )}
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px', fontSize: '0.85rem' }}>
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>{log.phone}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600 }}>{log.booking?.customer?.name || '-'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.booking?.bookingCode || '-'}</div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.85rem', color: '#4b5563' }}>
                    {log.content}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      backgroundColor: log.status === 'SENT' ? '#dcfce3' : (log.status === 'FAILED' ? '#fee2e2' : '#fef3c7'), 
                      color: log.status === 'SENT' ? '#16a34a' : (log.status === 'FAILED' ? '#dc2626' : '#92400e'),
                      whiteSpace: 'nowrap'
                    }}>
                      {log.status === 'SENT' ? 'Thành công' : (log.status === 'FAILED' ? 'Thất bại' : 'Đang chờ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
