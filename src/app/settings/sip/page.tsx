"use client";

import { useState, useEffect } from 'react';
import { useSip } from '@/lib/sip/use-sip';
import { 
  PhoneCall, 
  Sparkles, 
  Save, 
  RefreshCw, 
  ShieldCheck, 
  Server, 
  Wifi, 
  Volume2, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../settings.module.css';
import adminStyles from '../admin.module.css';

export default function SipSettingsPage() {
  const { config, saveConfig, connectionStatus, reconnect, simulateIncomingCall } = useSip();

  const [formData, setFormData] = useState({
    enabled: true,
    mode: 'SIMULATION' as 'LIVE' | 'SIMULATION',
    hotline: '0867757975',
    sipDomain: 'siptrunk.viettel.vn',
    wsServerUrl: 'wss://sip.nhaxe.vn:8089/ws',
    sipUsername: '0867757975',
    sipPassword: '',
    displayName: 'Nhà Xe Thanh Thiện',
    stunServer: 'stun:stun.l.google.com:19302',
    autoPopupOnCall: true,
    ringtoneVolume: 70
  });

  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        enabled: config.enabled ?? true,
        mode: config.mode || 'SIMULATION',
        hotline: config.hotline || '0867757975',
        sipDomain: config.sipDomain || 'siptrunk.viettel.vn',
        wsServerUrl: config.wsServerUrl || 'wss://sip.nhaxe.vn:8089/ws',
        sipUsername: config.sipUsername || '0867757975',
        sipPassword: config.sipPassword || '',
        displayName: config.displayName || 'Nhà Xe Thanh Thiện',
        stunServer: config.stunServer || 'stun:stun.l.google.com:19302',
        autoPopupOnCall: config.autoPopupOnCall ?? true,
        ringtoneVolume: Math.round((config.ringtoneVolume ?? 0.7) * 100)
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      saveConfig({
        enabled: formData.enabled,
        mode: formData.mode,
        hotline: formData.hotline,
        sipDomain: formData.sipDomain,
        wsServerUrl: formData.wsServerUrl,
        sipUsername: formData.sipUsername,
        sipPassword: formData.sipPassword,
        displayName: formData.displayName,
        stunServer: formData.stunServer,
        autoPopupOnCall: formData.autoPopupOnCall,
        ringtoneVolume: formData.ringtoneVolume / 100
      });

      // Save to server audit/settings
      await fetch('/api/settings/sip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ringtoneVolume: formData.ringtoneVolume / 100
        })
      });

      toast.success('Đã lưu cấu hình Viettel SIP Trunking thành công!');
    } catch (err: any) {
      toast.error('Lỗi khi lưu cấu hình: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const sampleAsteriskConfig = `; ========================================================
; FILE CẤU HÌNH MẪU ASTERISK (pjsip.conf) CHO VIETTEL SIP TRUNKING
; ========================================================

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

; --- Trunk Viettel Mobile ---
[viettel-trunk]
type=registration
outbound_auth=viettel-auth
server_uri=sip:${formData.sipDomain}
client_uri=sip:${formData.sipUsername}@${formData.sipDomain}
contact_user=${formData.hotline}
retry_interval=60
forbidden_retry_interval=300
expiration=3600

[viettel-auth]
type=auth
auth_type=userpass
username=${formData.sipUsername}
password=${formData.sipPassword || 'VIETTEL_PASSWORD'}
realm=${formData.sipDomain}

[viettel-aor]
type=aor
contact=sip:${formData.sipDomain}:5060

[viettel-endpoint]
type=endpoint
context=from-viettel-trunk
disallow=all
allow=alaw,ulaw,g729
aors=viettel-aor
outbound_auth=viettel-auth

; --- WebRTC Extension cho Web Dispatcher ---
[101]
type=endpoint
context=from-internal
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
dtls_auto_generate_cert=yes
use_avpf=yes
media_encryption=dtls
dtls_verify=fingerprint
dtls_setup=actpass
ice_support=yes
media_use_received_transport=yes
rtcp_mux=yes
auth=101-auth
aors=101-aor

[101-auth]
type=auth
auth_type=userpass
username=101
password=secure_webrtc_password

[101-aor]
type=aor
max_contacts=5
remove_existing=yes`;

  const copyConfig = () => {
    navigator.clipboard.writeText(sampleAsteriskConfig);
    setCopiedCode(true);
    toast.success('Đã sao chép cấu hình Asterisk pjsip.conf');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.eyebrow}>Quản trị hệ thống</span>
        <h1>Cấu hình Viettel SIP Trunking Mobile</h1>
        <p>
          Thiết lập đấu nối tổng đài thoại số hotline Viettel, cấu hình WebRTC Gateway và chuyển tiếp cuộc gọi đến bàn tổng đài viên.
        </p>
      </div>

      {/* Status Card */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px', 
        marginBottom: '28px' 
      }}>
        <div style={{ 
          background: 'var(--bg-panel)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '16px', 
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: connectionStatus === 'registered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: connectionStatus === 'registered' ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Wifi size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Trạng thái kết nối</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {connectionStatus === 'registered' ? (
                <>
                  <CheckCircle2 size={18} color="#10b981" />
                  <span style={{ color: '#10b981' }}>Đã đăng ký (Sẵn sàng)</span>
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <RefreshCw size={18} color="#f59e0b" className={styles.spin} />
                  <span style={{ color: '#f59e0b' }}>Đang kết nối...</span>
                </>
              ) : (
                <>
                  <AlertCircle size={18} color="#ef4444" />
                  <span style={{ color: '#ef4444' }}>Chưa kết nối SIP</span>
                </>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Chế độ: <strong>{formData.mode === 'LIVE' ? 'Trực tiếp (Live Viettel)' : 'Mô phỏng (Simulation)'}</strong>
            </div>
          </div>
        </div>

        <div style={{ 
          background: 'var(--bg-panel)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '16px', 
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Thao tác nhanh</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Kiểm thử cuộc gọi
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Mô phỏng khách hàng gọi đến để test âm thanh & tạo vé
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={adminStyles.btnSecondary}
              onClick={reconnect}
              title="Kết nối lại SIP"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              className={adminStyles.btnPrimary}
              onClick={() => {
                simulateIncomingCall();
                toast.success('Đã kích hoạt cuộc gọi giả lập!');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Sparkles size={16} />
              <span>Thử cuộc gọi tới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Form Settings */}
      <div style={{ 
        background: 'var(--bg-panel)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '16px', 
        padding: '28px',
        marginBottom: '32px' 
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={20} color="#0284c7" />
          <span>Thông số kỹ thuật SIP Trunking Viettel</span>
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* Mode Selector */}
            <div className={adminStyles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label className={adminStyles.label}>Chế độ hoạt động</label>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  cursor: 'pointer',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: formData.mode === 'SIMULATION' ? '2px solid #0284c7' : '1px solid var(--border-color)',
                  background: formData.mode === 'SIMULATION' ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-base)'
                }}>
                  <input
                    type="radio"
                    name="mode"
                    value="SIMULATION"
                    checked={formData.mode === 'SIMULATION'}
                    onChange={() => setFormData({ ...formData, mode: 'SIMULATION' })}
                  />
                  <div>
                    <strong>Chế độ Mô phỏng / Demo (Khuyên dùng khi chưa có hợp đồng)</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Vận hành 100% đầy đủ chức năng tổng đài, chuông gọi, nhận diện khách quen, tạo vé nhanh mà không cần máy chủ riêng.
                    </div>
                  </div>
                </label>

                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  cursor: 'pointer',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: formData.mode === 'LIVE' ? '2px solid #10b981' : '1px solid var(--border-color)',
                  background: formData.mode === 'LIVE' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-base)'
                }}>
                  <input
                    type="radio"
                    name="mode"
                    value="LIVE"
                    checked={formData.mode === 'LIVE'}
                    onChange={() => setFormData({ ...formData, mode: 'LIVE' })}
                  />
                  <div>
                    <strong>Chế độ Trực tiếp (Live Viettel SIP Trunking)</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Kết nối WebSocket WSS tới WebRTC Gateway (Asterisk/FreePBX) kết nối trực tiếp với đầu mối SIP Viettel Telecom.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Hotline */}
            <div className={adminStyles.formGroup}>
              <label className={adminStyles.label}>Số điện thoại Hotline nhà xe</label>
              <input
                type="text"
                className={adminStyles.input}
                value={formData.hotline}
                onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                placeholder="VD: 0867757975"
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Số điện thoại đại diện Viettel SIP Trunking sẽ hiển thị với khách.
              </small>
            </div>

            {/* SIP Domain / Proxy */}
            <div className={adminStyles.formGroup}>
              <label className={adminStyles.label}>SIP Domain / Viettel SBC Proxy</label>
              <input
                type="text"
                className={adminStyles.input}
                value={formData.sipDomain}
                onChange={(e) => setFormData({ ...formData, sipDomain: e.target.value })}
                placeholder="VD: siptrunk.viettel.vn hoặc 125.235.x.x"
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Địa chỉ máy chủ SIP Trunk do Viettel bàn giao trong hợp đồng.
              </small>
            </div>

            {/* WebRTC WebSocket URL */}
            <div className={adminStyles.formGroup}>
              <label className={adminStyles.label}>WebRTC Gateway WebSocket URL (WSS)</label>
              <input
                type="text"
                className={adminStyles.input}
                value={formData.wsServerUrl}
                onChange={(e) => setFormData({ ...formData, wsServerUrl: e.target.value })}
                placeholder="VD: wss://sip.nhaxe.vn:8089/ws"
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Cổng WebSocket kết nối Asterisk/FreePBX hỗ trợ giao thức WebRTC SIP.
              </small>
            </div>

            {/* SIP Username */}
            <div className={adminStyles.formGroup}>
              <label className={adminStyles.label}>Tài khoản SIP (Username / Trunk ID)</label>
              <input
                type="text"
                className={adminStyles.input}
                value={formData.sipUsername}
                onChange={(e) => setFormData({ ...formData, sipUsername: e.target.value })}
                placeholder="VD: 0867757975 hoặc 101"
                required
              />
            </div>

            {/* SIP Password */}
            <div className={adminStyles.formGroup}>
              <label className={adminStyles.label}>Mật khẩu SIP (SIP Password / Secret)</label>
              <input
                type="password"
                className={adminStyles.input}
                value={formData.sipPassword}
                onChange={(e) => setFormData({ ...formData, sipPassword: e.target.value })}
                placeholder="Nhập mật khẩu do Viettel cấp..."
              />
            </div>

            {/* Display Name */}
            <div className={adminStyles.formGroup}>
              <label className={adminStyles.label}>Tên hiển thị (Caller Display Name)</label>
              <input
                type="text"
                className={adminStyles.input}
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="VD: Nhà Xe Thanh Thiện"
              />
            </div>

            {/* Ringtone Volume */}
            <div className={adminStyles.formGroup}>
              <label className={adminStyles.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Volume2 size={16} /> Âm lượng chuông cuộc gọi ({formData.ringtoneVolume}%)
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={formData.ringtoneVolume}
                onChange={(e) => setFormData({ ...formData, ringtoneVolume: parseInt(e.target.value, 10) })}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>

            {/* Auto Popup */}
            <div className={adminStyles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 28 }}>
              <input
                type="checkbox"
                id="autoPopup"
                checked={formData.autoPopupOnCall}
                onChange={(e) => setFormData({ ...formData, autoPopupOnCall: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <label htmlFor="autoPopup" style={{ cursor: 'pointer', fontWeight: 600 }}>
                Tự động bật màn hình cuộc gọi và thông tin khách hàng khi có chuông
              </label>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="submit"
              disabled={isSaving}
              className={adminStyles.btnPrimary}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}
            >
              <Save size={18} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu cài đặt SIP'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Technical Deployment Guide */}
      <div style={{ 
        background: 'var(--bg-panel)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '16px', 
        padding: '28px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={20} color="#10b981" />
              <span>Sơ đồ triển khai Viettel SIP Trunking Mobile & File cấu hình mẫu</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              Khi bạn ký hợp đồng với Viettel, bạn chỉ cần nạp file cấu hình này vào tổng đài Asterisk / FreePBX để cầu nối WebRTC sẵn sàng ngay lập tức.
            </p>
          </div>

          <button
            type="button"
            className={adminStyles.btnSecondary}
            onClick={copyConfig}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {copiedCode ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{copiedCode ? 'Đã chép' : 'Chép file cấu hình'}</span>
          </button>
        </div>

        <div style={{ 
          background: 'var(--bg-base)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          padding: '16px',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          lineHeight: 1.6,
          maxHeight: '320px',
          overflowY: 'auto'
        }}>
          <pre style={{ margin: 0 }}>{sampleAsteriskConfig}</pre>
        </div>
      </div>
    </div>
  );
}
