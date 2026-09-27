"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

// ─── Live Preview Pill ───
function PricePill({ label, price, type }: { label: string; price: number; type: "ADULT" | "STUDENT" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", borderRadius: "10px",
      background: type === "ADULT" ? "linear-gradient(135deg,#eff6ff,#dbeafe)" : "linear-gradient(135deg,#fefce8,#fef9c3)",
      border: `1px solid ${type === "ADULT" ? "#93c5fd" : "#fde68a"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "1.3rem" }}>{type === "ADULT" ? "👤" : "🎓"}</span>
        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: type === "ADULT" ? "#1d4ed8" : "#a16207" }}>{label}</span>
      </div>
      <span style={{ fontWeight: 800, fontSize: "1.1rem", color: type === "ADULT" ? "#1d4ed8" : "#a16207" }}>{fmt(price)}</span>
    </div>
  );
}

// ─── Modal Giá Cơ Bản ───
function PriceModal({ routes, initial, onClose, onSaved }: { routes: any[]; initial?: any; onClose: () => void; onSaved: (p: any) => void }) {
  const [form, setForm] = useState({ name: initial?.name || "", ticketType: initial?.ticketType || "ADULT", routeId: initial?.routeId || "", basePrice: initial?.basePrice?.toString() || "130000" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.basePrice) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
    setSaving(true);
    const res = await fetch("/api/settings/prices", { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(initial ? { ...form, id: initial.id } : form) });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { toast.success(initial ? "Đã cập nhật giá" : "Đã thêm giá mới"); onSaved(data.price); }
    else toast.error(data.error || "Lỗi lưu");
  };

  const previewPrice = parseFloat(form.basePrice) || 0;

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
              {initial ? "Chỉnh sửa" : "Thêm mới"}
            </div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "white" }}>💵 Cấu hình giá vé</h3>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={fieldGroup}>
            <label style={fieldLabel}>Tên cấu hình</label>
            <input style={fieldInput} value={form.name} onChange={e => set("name", e.target.value)} placeholder="VD: Giá người lớn tuyến Tam Kỳ - Đà Nẵng" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Loại vé</label>
              <select style={fieldInput} value={form.ticketType} onChange={e => set("ticketType", e.target.value)}>
                <option value="ADULT">👤 Người lớn</option>
                <option value="STUDENT">🎓 Sinh viên</option>
              </select>
            </div>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Giá (VNĐ)</label>
              <input style={fieldInput} type="number" value={form.basePrice} onChange={e => set("basePrice", e.target.value)} step="1000" min="0" />
            </div>
          </div>
          <div style={fieldGroup}>
            <label style={fieldLabel}>Áp dụng cho tuyến</label>
            <select style={fieldInput} value={form.routeId} onChange={e => set("routeId", e.target.value)}>
              <option value="">🌐 Tất cả tuyến</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
            </select>
          </div>
          {previewPrice > 0 && (
            <div style={{ padding: "14px", borderRadius: "12px", background: "var(--bg-base)", border: "1px dashed var(--border-color)" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Xem trước</div>
              <PricePill label={form.ticketType === "ADULT" ? "Người lớn" : "Sinh viên"} price={previewPrice} type={form.ticketType as "ADULT" | "STUDENT"} />
            </div>
          )}
        </div>
        <div style={{ padding: "0 24px 24px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Huỷ</button>
          <button onClick={handleSave} disabled={saving} style={btnSave}>{saving ? "Đang lưu..." : "💾 Lưu cấu hình"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Ngày Lễ ───
function HolidayModal({ routes, initial, onClose, onSaved }: { routes: any[]; initial?: any; onClose: () => void; onSaved: (h: any) => void }) {
  const toDateInput = (d: string | Date) => new Date(d).toISOString().split("T")[0];
  const [form, setForm] = useState({ name: initial?.name || "", startDate: initial?.startDate ? toDateInput(initial.startDate) : "", endDate: initial?.endDate ? toDateInput(initial.endDate) : "", adjustType: initial?.adjustType || "PERCENTAGE", adjustValue: initial?.adjustValue?.toString() || "10", adjustMode: initial?.adjustMode || "INCREASE", routeId: initial?.routeId || "", active: initial?.active !== undefined ? initial.active : true });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const BASE_ADULT = 130000;
  const adj = parseFloat(form.adjustValue) || 0;
  const previewAdult = form.adjustType === "PERCENTAGE"
    ? (form.adjustMode === "INCREASE" ? BASE_ADULT * (1 + adj / 100) : BASE_ADULT * (1 - adj / 100))
    : (form.adjustMode === "INCREASE" ? BASE_ADULT + adj : BASE_ADULT - adj);

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate || !form.adjustValue) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { toast.error("Ngày kết thúc phải sau ngày bắt đầu"); return; }
    setSaving(true);
    const res = await fetch("/api/settings/holidays", { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(initial ? { ...form, id: initial.id } : form) });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { toast.success(initial ? "Đã cập nhật" : "Đã thêm ngày lễ"); onSaved(data.holiday); }
    else toast.error(data.error || "Lỗi lưu");
  };

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: "560px" }}>
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{initial ? "Chỉnh sửa" : "Thêm mới"}</div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "white" }}>🗓️ Ngày lễ / Giá đặc biệt</h3>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={fieldGroup}>
            <label style={fieldLabel}>Tên sự kiện</label>
            <input style={fieldInput} value={form.name} onChange={e => set("name", e.target.value)} placeholder="VD: Tết Nguyên Đán 2026, Mùa hè, Lễ 30/4..." />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Từ ngày</label>
              <input style={fieldInput} type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
            </div>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Đến ngày</label>
              <input style={fieldInput} type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} />
            </div>
          </div>

          {/* Adjustment type selector */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>Loại điều chỉnh</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { v: "PERCENTAGE", icon: "📊", label: "Theo %" },
                { v: "FIXED", icon: "💰", label: "Số tiền cố định" },
              ].map(({ v, icon, label }) => (
                <button key={v} type="button" onClick={() => set("adjustType", v)} style={{
                  padding: "10px", borderRadius: "10px", border: `2px solid ${form.adjustType === v ? "#6366f1" : "var(--border-color)"}`,
                  background: form.adjustType === v ? "linear-gradient(135deg,#eff6ff,#eef2ff)" : "var(--bg-base)",
                  color: form.adjustType === v ? "#6366f1" : "var(--text-muted)", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem",
                  transition: "all 0.15s",
                }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Increase / Decrease selector */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>Tác động</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { v: "INCREASE", icon: "📈", label: "Tăng giá", color: "#dc2626" },
                { v: "DECREASE", icon: "📉", label: "Giảm giá", color: "#16a34a" },
              ].map(({ v, icon, label, color }) => (
                <button key={v} type="button" onClick={() => set("adjustMode", v)} style={{
                  padding: "10px", borderRadius: "10px", border: `2px solid ${form.adjustMode === v ? color : "var(--border-color)"}`,
                  background: form.adjustMode === v ? (v === "INCREASE" ? "linear-gradient(135deg,#fff5f5,#fee2e2)" : "linear-gradient(135deg,#f0fdf4,#dcfce7)") : "var(--bg-base)",
                  color: form.adjustMode === v ? color : "var(--text-muted)", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem",
                  transition: "all 0.15s",
                }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Giá trị ({form.adjustType === "PERCENTAGE" ? "%" : "VNĐ"})</label>
              <input style={fieldInput} type="number" value={form.adjustValue} onChange={e => set("adjustValue", e.target.value)} min="0" step={form.adjustType === "PERCENTAGE" ? "0.5" : "1000"} placeholder={form.adjustType === "PERCENTAGE" ? "VD: 20" : "VD: 30000"} />
            </div>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Áp dụng tuyến</label>
              <select style={fieldInput} value={form.routeId} onChange={e => set("routeId", e.target.value)}>
                <option value="">🌐 Tất cả tuyến</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
              </select>
            </div>
          </div>

          {/* Live Preview */}
          {adj > 0 && (
            <div style={{ padding: "16px", borderRadius: "12px", background: form.adjustMode === "INCREASE" ? "linear-gradient(135deg,#fff7ed,#fef3c7)" : "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: `1px solid ${form.adjustMode === "INCREASE" ? "#f59e0b" : "#22c55e"}` }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: form.adjustMode === "INCREASE" ? "#b45309" : "#15803d", marginBottom: "10px" }}>
                {form.adjustMode === "INCREASE" ? "📈" : "📉"} Xem trước điều chỉnh (dựa trên giá mặc định 130.000đ)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "1.1rem" }}>{fmt(BASE_ADULT)}</span>
                <span style={{ fontSize: "1.3rem" }}>{form.adjustMode === "INCREASE" ? "→" : "→"}</span>
                <span style={{ fontWeight: 800, fontSize: "1.4rem", color: form.adjustMode === "INCREASE" ? "#dc2626" : "#16a34a" }}>{fmt(Math.max(0, previewAdult))}</span>
                <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700, background: form.adjustMode === "INCREASE" ? "#fee2e2" : "#dcfce7", color: form.adjustMode === "INCREASE" ? "#dc2626" : "#16a34a" }}>
                  {form.adjustMode === "INCREASE" ? "+" : "-"}{form.adjustType === "PERCENTAGE" ? `${adj}%` : fmt(adj)}
                </span>
              </div>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500 }}>
            <div style={{ position: "relative", width: "42px", height: "24px", cursor: "pointer" }} onClick={() => set("active", !form.active)}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "12px", background: form.active ? "#6366f1" : "#d1d5db", transition: "background 0.2s" }} />
              <div style={{ position: "absolute", top: "3px", left: form.active ? "21px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.3)", transition: "left 0.2s" }} />
            </div>
            <span style={{ color: form.active ? "#6366f1" : "var(--text-muted)" }}>{form.active ? "Đang hoạt động" : "Tắt"}</span>
          </label>
        </div>
        <div style={{ padding: "0 24px 24px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Huỷ</button>
          <button onClick={handleSave} disabled={saving} style={btnSave}>{saving ? "Đang lưu..." : "💾 Lưu ngày lễ"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── PriceCard ───
function PriceCard({ item, onEdit, onDelete }: { item: any; onEdit: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "16px", padding: "24px", cursor: "pointer", position: "relative",
        background: "var(--bg-panel)",
        border: `1px solid ${hovered ? "var(--primary)" : "var(--border-color)"}`,
        boxShadow: hovered ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
      }}
    >
      {/* Badge loại vé */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <span style={{
          padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
          background: "var(--bg-base)", color: "var(--text-muted)",
        }}>
          {item.ticketType === "ADULT" ? "👤 Người lớn" : "🎓 Sinh viên"}
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ ...actionBtn, background: "var(--bg-panel)", color: "var(--text-main)", border: "1px solid var(--border-color)" }}>✏️</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ ...actionBtn, background: "var(--bg-panel)", color: "var(--danger)", border: "1px solid var(--border-color)" }}>🗑️</button>
        </div>
      </div>
      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px" }}>{item.name}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>{fmt(item.basePrice)}</div>
      <div style={{ marginTop: "10px", fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
        🛣️ {item.route ? `${item.route.origin} → ${item.route.destination}` : "Tất cả tuyến"}
      </div>
    </div>
  );
}

// ─── HolidayCard ───
function HolidayCard({ item, onEdit, onDelete, onToggle }: { item: any; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  const [hovered, setHovered] = useState(false);
  const now = new Date();
  const start = new Date(item.startDate);
  const end = new Date(item.endDate);
  const isLive = item.active && now >= start && now <= end;
  const isPast = end < now;
  const isUpcoming = item.active && start > now;
  const daysLeft = isUpcoming ? Math.ceil((start.getTime() - now.getTime()) / 86400000) : 0;

  const gradBg = item.adjustMode === "INCREASE"
    ? (isLive ? "linear-gradient(135deg,#fff7ed,#fef3c7)" : "linear-gradient(135deg,#fafafa,#f3f4f6)")
    : (isLive ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "linear-gradient(135deg,#fafafa,#f3f4f6)");
  const borderColor = isLive ? (item.adjustMode === "INCREASE" ? "#f59e0b" : "#22c55e") : isPast ? "#e5e7eb" : "#d1d5db";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "16px", padding: "20px", position: "relative", opacity: isPast ? 0.6 : 1,
        background: "var(--bg-panel)",
        border: `1px solid ${hovered && !isPast ? "var(--primary)" : "var(--border-color)"}`,
        boxShadow: hovered && !isPast ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hovered && !isPast ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
      }}
    >
      {/* Status glow badge */}
      {isLive && (
        <div style={{ position: "absolute", top: "16px", right: "16px", display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.adjustMode === "INCREASE" ? "#f59e0b" : "#22c55e", boxShadow: `0 0 0 3px ${item.adjustMode === "INCREASE" ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`, animation: "pulse 2s infinite", display: "inline-block" }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: item.adjustMode === "INCREASE" ? "#b45309" : "#15803d" }}>ĐANG ÁP DỤNG</span>
        </div>
      )}
      {isUpcoming && (
        <div style={{ position: "absolute", top: "16px", right: "16px", padding: "3px 8px", borderRadius: "6px", background: "#fef9c3", color: "#a16207", fontSize: "0.75rem", fontWeight: 700 }}>
          Còn {daysLeft} ngày
        </div>
      )}

      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: "4px", color: isPast ? "var(--text-muted)" : "var(--text-main)" }}>{item.name}</div>
        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>📅 {fmtDate(item.startDate)} — {fmtDate(item.endDate)}</div>
      </div>

      {/* Adjustment badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "24px", marginBottom: "12px", background: item.adjustMode === "INCREASE" ? "#fee2e2" : "#dcfce7", color: item.adjustMode === "INCREASE" ? "#dc2626" : "#16a34a", fontWeight: 800, fontSize: "1.05rem" }}>
        {item.adjustMode === "INCREASE" ? "📈 +" : "📉 -"}
        {item.adjustType === "PERCENTAGE" ? `${item.adjustValue}%` : fmt(item.adjustValue)}
      </div>

      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "14px" }}>
        🛣️ {item.route ? `${item.route.origin} → ${item.route.destination}` : "Tất cả tuyến"}
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button onClick={onToggle} style={{
          flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid var(--border-color)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
          background: item.active ? "var(--bg-panel)" : "var(--bg-base)", color: item.active ? "var(--text-muted)" : "var(--text-main)", transition: "all 0.15s",
        }}>
          {item.active ? "⏸ Tắt" : "▶ Bật"}
        </button>
        <button onClick={onEdit} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-panel)", color: "var(--text-main)", cursor: "pointer", fontSize: "0.85rem" }}>✏️</button>
        <button onClick={onDelete} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", color: "var(--danger)", background: "var(--bg-panel)", cursor: "pointer", fontSize: "0.85rem" }}>🗑️</button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───
export default function PricesPage() {
  const [tab, setTab] = useState<"prices" | "holidays">("prices");
  const [prices, setPrices] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceModal, setPriceModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [holidayModal, setHolidayModal] = useState<{ open: boolean; item?: any }>({ open: false });

  const load = async () => {
    setLoading(true);
    const [p, h, s] = await Promise.all([
      fetch("/api/settings/prices").then(r => r.json()),
      fetch("/api/settings/holidays").then(r => r.json()),
      fetch("/api/settings/schedules").then(r => r.json()),
    ]);
    setPrices(p.prices || []);
    setHolidays(h.holidays || []);
    setRoutes(s.routes || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const deletePrice = async (id: string) => {
    if (!confirm("Xác nhận xóa?")) return;
    const res = await fetch(`/api/settings/prices?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Đã xóa"); setPrices(p => p.filter(x => x.id !== id)); }
    else toast.error("Lỗi xóa");
  };
  const deleteHoliday = async (id: string) => {
    if (!confirm("Xác nhận xóa?")) return;
    const res = await fetch(`/api/settings/holidays?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Đã xóa"); setHolidays(h => h.filter(x => x.id !== id)); }
    else toast.error("Lỗi xóa");
  };
  const toggleHoliday = async (h: any) => {
    const res = await fetch("/api/settings/holidays", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...h, active: !h.active }) });
    if (res.ok) setHolidays(prev => prev.map(x => x.id === h.id ? { ...x, active: !x.active } : x));
  };

  const activeHolidays = holidays.filter(h => { const now = new Date(); return h.active && new Date(h.startDate) <= now && new Date(h.endDate) >= now; });

  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} } @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { font-family: 'Inter', sans-serif; }`}</style>

      {/* ── Hero Header ── */}
      <div style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border-color)", padding: "40px 32px 32px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <a href="/settings" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "20px" }}>← Quay về Cài đặt</a>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <h1 style={{ margin: "0 0 8px", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main)" }}>
                Cài Đặt Giá Vé
              </h1>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>Quản lý giá vé cơ bản và giá đặc biệt theo ngày lễ, sự kiện</p>
            </div>
            <button
              onClick={() => tab === "prices" ? setPriceModal({ open: true }) : setHolidayModal({ open: true })}
              style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "white", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", transition: "all 0.2s" }}
            >
              + {tab === "prices" ? "Thêm giá mới" : "Thêm ngày lễ"}
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "12px", marginTop: "28px" }}>
            {[
              { label: "Cấu hình giá", value: prices.length, icon: "📋" },
              { label: "Đang áp dụng ngày lễ", value: activeHolidays.length, icon: "🎉" },
              { label: "Tổng ngày lễ", value: holidays.length, icon: "📅" },
            ].map(s => (
              <div key={s.label} style={{ padding: "16px 20px", borderRadius: "12px", background: "var(--bg-base)", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: "8px" }}>{s.icon}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 32px 48px" }}>
        {/* Active holiday alert */}
        {activeHolidays.length > 0 && (
          <div style={{ margin: "20px 0", padding: "14px 20px", borderRadius: "12px", background: "linear-gradient(135deg,#fff7ed,#fef3c7)", border: "2px solid #f59e0b", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.5rem" }}>🔔</span>
            <div>
              <strong style={{ color: "#b45309" }}>Có {activeHolidays.length} ngày lễ đang được áp dụng:</strong>
              <span style={{ color: "#92400e", marginLeft: "8px", fontSize: "0.9rem" }}>{activeHolidays.map(h => h.name).join(" · ")}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0", marginTop: "24px", borderBottom: "2px solid var(--border-color)" }}>
          {([["prices", "📋 Giá cơ bản"], ["holidays", "🎉 Ngày lễ / Giá đặc biệt"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "12px 28px", border: "none", borderBottom: tab === t ? "3px solid #6366f1" : "3px solid transparent",
              background: "none", fontWeight: tab === t ? 700 : 500, color: tab === t ? "#6366f1" : "var(--text-muted)",
              cursor: "pointer", fontSize: "0.95rem", marginBottom: "-2px", transition: "all 0.2s",
              borderRadius: "0",
            }}>
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "80px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px", animation: "spin 1s linear infinite" }}>⏳</div>
            Đang tải dữ liệu...
          </div>
        )}

        {/* Tab: Giá cơ bản */}
        {!loading && tab === "prices" && (
          <>
            {prices.length === 0 ? (
              <EmptyState icon="💵" title="Chưa có cấu hình giá" desc="Hệ thống đang dùng giá mặc định: Người lớn 130,000đ · Sinh viên 120,000đ. Thêm cấu hình để thay đổi." onAdd={() => setPriceModal({ open: true })} />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px", marginTop: "24px" }}>
                {prices.map(p => (
                  <PriceCard key={p.id} item={p} onEdit={() => setPriceModal({ open: true, item: p })} onDelete={() => deletePrice(p.id)} />
                ))}
                <button onClick={() => setPriceModal({ open: true })} style={{
                  borderRadius: "16px", padding: "24px", border: "2px dashed var(--border-color)", background: "transparent",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: "8px", color: "var(--text-muted)", fontSize: "0.9rem", minHeight: "140px", transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: "2rem" }}>＋</span>
                  Thêm cấu hình giá
                </button>
              </div>
            )}
          </>
        )}

        {/* Tab: Ngày lễ */}
        {!loading && tab === "holidays" && (
          <>
            {holidays.length === 0 ? (
              <EmptyState icon="🗓️" title="Chưa có ngày lễ" desc="Thêm ngày lễ để tự động điều chỉnh giá vé trong khoảng thời gian đặc biệt." onAdd={() => setHolidayModal({ open: true })} />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginTop: "24px" }}>
                {holidays.map(h => (
                  <HolidayCard key={h.id} item={h} onEdit={() => setHolidayModal({ open: true, item: h })} onDelete={() => deleteHoliday(h.id)} onToggle={() => toggleHoliday(h)} />
                ))}
                <button onClick={() => setHolidayModal({ open: true })} style={{
                  borderRadius: "16px", padding: "24px", border: "2px dashed var(--border-color)", background: "transparent",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: "8px", color: "var(--text-muted)", fontSize: "0.9rem", minHeight: "160px", transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: "2rem" }}>＋</span>
                  Thêm ngày lễ mới
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {priceModal.open && (
        <PriceModal routes={routes} initial={priceModal.item} onClose={() => setPriceModal({ open: false })}
          onSaved={p => { setPriceModal({ open: false }); if (priceModal.item) setPrices(prev => prev.map(x => x.id === p.id ? p : x)); else setPrices(prev => [...prev, p]); }}
        />
      )}
      {holidayModal.open && (
        <HolidayModal routes={routes} initial={holidayModal.item} onClose={() => setHolidayModal({ open: false })}
          onSaved={h => { setHolidayModal({ open: false }); if (holidayModal.item) setHolidays(prev => prev.map(x => x.id === h.id ? h : x)); else setHolidays(prev => [...prev, h]); }}
        />
      )}
    </>
  );
}

function EmptyState({ icon, title, desc, onAdd }: { icon: string; title: string; desc: string; onAdd: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px", marginTop: "24px" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: "8px" }}>{title}</div>
      <div style={{ color: "var(--text-muted)", marginBottom: "28px", maxWidth: "380px", margin: "0 auto 28px", lineHeight: 1.6 }}>{desc}</div>
      <button onClick={onAdd} style={{ padding: "12px 32px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", boxShadow: "0 4px 15px rgba(99,102,241,0.35)" }}>
        + Thêm mới
      </button>
    </div>
  );
}

// ─── Shared Styles ───
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" };
const modal: React.CSSProperties = { background: "var(--bg-panel)", borderRadius: "20px", width: "100%", maxWidth: "480px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", maxHeight: "92vh", overflowY: "auto", border: "1px solid var(--border-color)" };
const modalHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 24px", background: "linear-gradient(135deg,#1e1b4b,#312e81)", borderBottom: "none" };
const closeBtn: React.CSSProperties = { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" };
const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "6px" };
const fieldLabel: React.CSSProperties = { fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" };
const fieldInput: React.CSSProperties = { padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-base)", color: "var(--text-main)", fontSize: "0.95rem", width: "100%", boxSizing: "border-box", outline: "none" };
const btnSave: React.CSSProperties = { padding: "11px 28px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.92rem", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" };
const btnGhost: React.CSSProperties = { padding: "11px 20px", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-base)", color: "var(--text-main)", fontWeight: 600, cursor: "pointer", fontSize: "0.92rem" };
const actionBtn: React.CSSProperties = { width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border-color)", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" };
