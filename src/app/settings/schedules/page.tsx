"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

// ─── ScheduleModal ───
function ScheduleModal({ routes, vehicleTypes, drivers, defaultRouteId, initial, onClose, onSaved }: { routes: any[]; vehicleTypes: string[]; drivers: any[]; defaultRouteId?: string; initial?: any; onClose: () => void; onSaved: (s: any) => void }) {
  const [form, setForm] = useState({ 
    routeId: initial?.routeId || defaultRouteId || (routes[0]?.id || ""), 
    departureTime: initial?.departureTime || "", 
    active: initial?.active !== undefined ? initial.active : true, 
    vehicleType: initial?.vehicleType || "",
    driverId: initial?.driverId || ""
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.routeId || !form.departureTime) { toast.error("Vui lòng chọn tuyến và nhập giờ"); return; }
    setSaving(true);
    try {
      const method = initial ? "PUT" : "POST";
      const body = initial ? { id: initial.id, departureTime: form.departureTime, active: form.active, vehicleType: form.vehicleType, driverId: form.driverId } : form;
      const res = await fetch("/api/settings/schedules", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      setSaving(false);
      if (res.ok) { 
        toast.success(initial ? "Đã cập nhật giờ chạy" : "Đã thêm giờ mới"); 
        onSaved(data.schedule); 
      }
      else {
        toast.error(data.error || "Lỗi lưu");
      }
    } catch (err: any) {
      setSaving(false);
      toast.error(err?.message || "Lỗi kết nối");
    }
  };

  const selectedRoute = routes.find(r => r.id === form.routeId);

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{initial ? "Chỉnh sửa" : "Thêm mới"}</div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "white" }}>🕐 Giờ khởi hành</h3>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {!initial ? (
            <div style={fieldGroup}>
              <label style={fieldLabel}>Tuyến đường</label>
              <select style={fieldInput} value={form.routeId} onChange={e => set("routeId", e.target.value)}>
                {routes.map(r => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
              </select>
            </div>
          ) : (
            <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Tuyến: <strong style={{ color: "#6366f1" }}>{initial.route?.origin} → {initial.route?.destination}</strong>
            </div>
          )}

          {/* Large time picker */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>Giờ khởi hành</label>
            <div style={{ position: "relative" }}>
              <input
                type="time"
                style={{ ...fieldInput, fontSize: "2rem", fontWeight: 800, textAlign: "center", padding: "16px", letterSpacing: "0.1em", color: "#6366f1", borderColor: "#a5b4fc" }}
                value={form.departureTime}
                onChange={e => set("departureTime", e.target.value)}
              />
            </div>
            {form.departureTime && selectedRoute && (
              <div style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {selectedRoute.origin} → {selectedRoute.destination} lúc <strong style={{ color: "#6366f1" }}>{form.departureTime}</strong>
              </div>
            )}
          </div>

          {/* Vehicle Type picker */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>Loại xe bắt buộc</label>
            <select style={fieldInput} value={form.vehicleType} onChange={e => set("vehicleType", e.target.value)}>
              <option value="">Không bắt buộc (Chọn xe bất kỳ rảnh)</option>
              {vehicleTypes.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Driver picker */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>Tài xế mặc định</label>
            <select style={fieldInput} value={form.driverId} onChange={e => set("driverId", e.target.value)}>
              <option value="">Không chỉ định (Tự chọn sau)</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
            </select>
          </div>

          {/* Active toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "12px 16px", borderRadius: "10px", background: "var(--bg-base)", border: "1px solid var(--border-color)" }} onClick={() => set("active", !form.active)}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Kích hoạt ngay</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>Giờ này sẽ xuất hiện khi đặt vé</div>
            </div>
            <div style={{ position: "relative", width: "46px", height: "26px", flexShrink: 0 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "13px", background: form.active ? "#6366f1" : "#d1d5db", transition: "background 0.2s" }} />
              <div style={{ position: "absolute", top: "3px", left: form.active ? "23px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", transition: "left 0.2s" }} />
            </div>
          </div>
        </div>
        <div style={{ padding: "0 24px 24px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Huỷ</button>
          <button onClick={handleSave} disabled={saving} style={btnSave}>{saving ? "Đang lưu..." : "💾 Lưu giờ chạy"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ScheduleCard ───
function ScheduleCard({ schedule, onToggle, onEdit, onDelete }: { schedule: any; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [h, m] = schedule.departureTime.split(":").map(Number);
  const period = h < 12 ? "SA" : h < 18 ? "CH" : "TỐI";
  const periodColor = h < 12 ? "#f59e0b" : h < 18 ? "#3b82f6" : "#8b5cf6";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "16px", padding: "20px", position: "relative",
        background: "var(--bg-panel)",
        border: `1px solid ${hovered ? "var(--primary)" : "var(--border-color)"}`,
        boxShadow: hovered ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
        opacity: schedule.active ? 1 : 0.5,
      }}
    >
      {/* Period badge */}
      <div style={{ position: "absolute", top: "16px", right: "16px", padding: "4px 8px", borderRadius: "6px", background: "var(--bg-base)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em" }}>
        {period}
      </div>

      {/* Time display */}
      <div style={{
        fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1,
        color: schedule.active ? "var(--text-main)" : "var(--text-muted)",
        marginBottom: "10px",
        fontVariantNumeric: "tabular-nums",
      }}>
        {schedule.departureTime}
      </div>

      {/* Vehicle Type */}
      <div style={{ marginBottom: "6px", fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 600 }}>
        🚗 {schedule.vehicleType || "Xe ngẫu nhiên"}
      </div>

      {/* Driver */}
      <div style={{ marginBottom: "12px", fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 600 }}>
        🧑‍✈️ {schedule.driver ? schedule.driver.name : "Chưa chỉ định"}
      </div>

      {/* Status */}
      <div style={{ marginBottom: "16px" }}>
        {schedule.active ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", background: "#dcfce7", color: "#15803d", fontSize: "0.75rem", fontWeight: 700 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Đang chạy
          </div>
        ) : (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", background: "#f3f4f6", color: "#6b7280", fontSize: "0.75rem", fontWeight: 700 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#d1d5db", display: "inline-block" }} />
            Đã tắt
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={onToggle} style={{
          flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid var(--border-color)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
          background: schedule.active ? "var(--bg-panel)" : "var(--bg-base)",
          color: schedule.active ? "var(--text-muted)" : "var(--text-main)",
          transition: "all 0.15s",
        }}>
          {schedule.active ? "⏸ Tắt" : "▶ Bật"}
        </button>
        <button onClick={onEdit} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-panel)", color: "var(--text-main)", cursor: "pointer", fontSize: "0.85rem", transition: "all 0.15s" }}>✏️</button>
        <button onClick={onDelete} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", color: "var(--danger)", background: "var(--bg-panel)", cursor: "pointer", fontSize: "0.85rem", transition: "all 0.15s" }}>🗑️</button>
      </div>
    </div>
  );
}

// ─── Timeline ───
function TimelineBar({ schedules }: { schedules: any[] }) {
  if (schedules.length === 0) return null;
  const sorted = [...schedules].sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return (
    <div style={{ padding: "16px 20px", background: "var(--bg-base)", borderRadius: "12px", border: "1px solid var(--border-color)", overflowX: "auto" }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>📍 Dòng thời gian</div>
      <div style={{ display: "flex", alignItems: "center", gap: "0", minWidth: "fit-content" }}>
        {sorted.map((s, i) => {
          const isPassed = s.departureTime < currentTime;
          const h = parseInt(s.departureTime.split(":")[0]);
          const color = h < 12 ? "#f59e0b" : h < 18 ? "#3b82f6" : "#8b5cf6";
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: isPassed ? "#9ca3af" : color, whiteSpace: "nowrap" }}>{s.departureTime}</div>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: s.active ? (isPassed ? "#9ca3af" : color) : "#e5e7eb", border: `2px solid ${s.active ? (isPassed ? "#d1d5db" : color) : "#e5e7eb"}`, flexShrink: 0 }} />
                <div style={{ fontSize: "0.65rem", color: isPassed ? "#9ca3af" : (s.active ? "#6b7280" : "#d1d5db") }}>{s.active ? "✓" : "○"}</div>
              </div>
              {i < sorted.length - 1 && <div style={{ width: "40px", height: "2px", background: "var(--border-color)", flexShrink: 0, margin: "0 2px", marginTop: "-8px" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───
import { useRouter } from "next/navigation";

export default function SchedulesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("ALL");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{ open: boolean; item?: any; defaultRouteId?: string }>({ open: false });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/settings/schedules");
    const data = await res.json();
    setRoutes(data.routes || []);
    setVehicleTypes(data.vehicleTypes || []);
    setDrivers(data.drivers || []);
    setSchedules(data.schedules || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = schedules.filter(s => {
    const matchRoute = selectedRouteId === "ALL" || s.routeId === selectedRouteId;
    const matchDriver = selectedDriverId === "ALL" || (s.driverId === selectedDriverId);
    return matchRoute && matchDriver;
  });
  const grouped: Record<string, any[]> = {};
  filtered.forEach(s => { if (!grouped[s.routeId]) grouped[s.routeId] = []; grouped[s.routeId].push(s); });

  const toggleSchedule = async (s: any) => {
    try {
      const res = await fetch("/api/settings/schedules", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, active: !s.active }) });
      if (!res.ok) {
        let errMessage = "Lỗi cập nhật";
        try {
          const data = await res.json();
          if (data.error) errMessage = data.error;
        } catch(e) {
          errMessage = await res.text();
        }
        throw new Error(errMessage);
      }
      setSchedules(prev => prev.map(x => x.id === s.id ? { ...x, active: !s.active } : x));
      toast.success(!s.active ? "Đã bật giờ chạy" : "Đã tắt giờ chạy");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Lỗi bật/tắt");
    }
  };
  const deleteSchedule = async (s: any) => {
    if (!confirm(`Xóa giờ ${s.departureTime}?`)) return;
    try {
      const res = await fetch(`/api/settings/schedules?id=${s.id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Lỗi xóa");
      }
      toast.success("Đã xóa giờ chạy"); 
      setSchedules(prev => prev.filter(x => x.id !== s.id));
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa");
    }
  };

  const totalActive = schedules.filter(s => s.active).length;
  const totalSchedules = schedules.length;

  // Next upcoming departure
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const nextDeparture = [...schedules].filter(s => s.active && s.departureTime > nowStr).sort((a, b) => a.departureTime.localeCompare(b.departureTime))[0];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { font-family: 'Inter', sans-serif; } @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>

      {/* ── Hero Header ── */}
      <div style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border-color)", padding: "40px 32px 32px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <a href="/settings" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "20px" }}>← Quay về Cài đặt</a>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <h1 style={{ margin: "0 0 8px", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main)" }}>
                Giờ Chạy Xe
              </h1>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>Quản lý lịch trình khởi hành theo từng tuyến đường</p>
            </div>
            <button onClick={() => setModalState({ open: true, defaultRouteId: selectedRouteId !== "ALL" ? selectedRouteId : undefined })}
              style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "white", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", transition: "all 0.2s" }}>
              + Thêm giờ mới
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "12px", marginTop: "28px" }}>
            {[
              { label: "Tổng giờ chạy", value: totalSchedules, icon: "📋" },
              { label: "Đang hoạt động", value: totalActive, icon: "✅" },
              { label: "Đã tắt", value: totalSchedules - totalActive, icon: "⏸" },
              { label: "Chuyến tiếp theo", value: nextDeparture?.departureTime || "--:--", icon: "🚌" },
            ].map(s => (
              <div key={s.label} style={{ padding: "16px 20px", borderRadius: "12px", background: "var(--bg-base)", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: "8px" }}>{s.icon}</div>
                <div style={{ fontSize: typeof s.value === "string" ? "1.2rem" : "1.5rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 32px 48px" }}>
        {/* Route filter */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {[{ id: "ALL", origin: "🌐 Tất cả", destination: "tuyến" }, ...routes].map(r => {
            const isSelected = r.id === selectedRouteId;
            const label = r.id === "ALL" ? "🌐 Tất cả tuyến" : `${r.origin} → ${r.destination}`;
            return (
              <button key={r.id} onClick={() => setSelectedRouteId(r.id)} style={{
                padding: "8px 16px", borderRadius: "8px", border: `1px solid ${isSelected ? "var(--primary)" : "var(--border-color)"}`,
                background: isSelected ? "var(--primary)" : "var(--bg-panel)",
                color: isSelected ? "white" : "var(--text-main)", fontWeight: 600,
                cursor: "pointer", fontSize: "0.85rem", transition: "all 0.15s",
              }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Driver filter */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginRight: "8px" }}>Tài xế:</span>
          {[{ id: "ALL", name: "👨‍✈️ Tất cả" }, ...drivers].map(d => {
            const isSelected = d.id === selectedDriverId;
            return (
              <button key={d.id} onClick={() => setSelectedDriverId(d.id)} style={{
                padding: "6px 14px", borderRadius: "6px", border: `1px solid ${isSelected ? "var(--primary)" : "var(--border-color)"}`,
                background: isSelected ? "var(--primary)" : "var(--bg-panel)",
                color: isSelected ? "white" : "var(--text-main)", fontWeight: 600,
                cursor: "pointer", fontSize: "0.8rem", transition: "all 0.15s",
              }}>
                {d.name}
              </button>
            );
          })}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "80px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "16px", animation: "float 2s ease-in-out infinite" }}>🕐</div>
            Đang tải lịch trình...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🕐</div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: "8px" }}>Chưa có giờ chạy nào</div>
            <div style={{ color: "var(--text-muted)", marginBottom: "28px" }}>Thêm giờ khởi hành để hệ thống tự tạo chuyến xe.</div>
            <button onClick={() => setModalState({ open: true })} style={{ padding: "12px 32px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", boxShadow: "0 4px 15px rgba(99,102,241,0.35)" }}>
              + Thêm giờ mới
            </button>
          </div>
        )}

        {!loading && routes.filter(r => grouped[r.id]).map((route) => {
          const routeId = route.id;
          const items = grouped[routeId];
          const activeItems = items.filter(s => s.active);
          const [h] = items[0]?.departureTime?.split(":").map(Number) || [8];
          return (
            <div key={routeId} style={{ marginBottom: "40px" }}>
              {/* Route header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "4px", height: "24px", borderRadius: "2px", background: "var(--primary)" }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-main)" }}>
                      {route?.origin?.toUpperCase()} <span style={{ color: "var(--text-muted)" }}>→</span> {route?.destination?.toUpperCase()}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {activeItems.length}/{items.length} giờ đang hoạt động
                    </div>
                  </div>
                </div>
                <button onClick={() => setModalState({ open: true, defaultRouteId: routeId })} style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-base)", color: "var(--text-main)", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", transition: "all 0.15s" }}>
                  + Thêm giờ
                </button>
              </div>

              {/* Timeline */}
              <div style={{ marginBottom: "16px" }}>
                <TimelineBar schedules={items} />
              </div>

              {/* Cards grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: "12px" }}>
                {[...items].sort((a, b) => a.departureTime.localeCompare(b.departureTime)).map(s => (
                  <ScheduleCard key={s.id} schedule={s} onToggle={() => toggleSchedule(s)} onEdit={() => setModalState({ open: true, item: s })} onDelete={() => deleteSchedule(s)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modalState.open && (
        <ScheduleModal
          routes={routes}
          vehicleTypes={vehicleTypes}
          drivers={drivers}
          defaultRouteId={modalState.defaultRouteId}
          initial={modalState.item}
          onClose={() => setModalState({ open: false })}
          onSaved={s => {
            setModalState({ open: false });
            if (modalState.item) setSchedules(prev => prev.map(x => x.id === s.id ? s : x));
            else { setSchedules(prev => [...prev, s]); if (selectedRouteId === "ALL") setSelectedRouteId(s.routeId); }
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ─── Shared Styles ───
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" };
const modal: React.CSSProperties = { background: "var(--bg-panel)", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)", border: "1px solid var(--border-color)", overflow: "hidden" };
const modalHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 24px", background: "linear-gradient(135deg,#1e1b4b,#312e81)", borderBottom: "none" };
const closeBtn: React.CSSProperties = { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" };
const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "6px" };
const fieldLabel: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" };
const fieldInput: React.CSSProperties = { padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-base)", color: "var(--text-main)", fontSize: "0.95rem", width: "100%", boxSizing: "border-box", outline: "none" };
const btnSave: React.CSSProperties = { padding: "11px 28px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.92rem", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" };
const btnGhost: React.CSSProperties = { padding: "11px 20px", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-base)", color: "var(--text-main)", fontWeight: 600, cursor: "pointer", fontSize: "0.92rem" };
