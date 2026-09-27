"use client";

import { useState, useEffect } from "react";
import styles from "../management.module.css";
import toast from "react-hot-toast";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    plateNumber: "",
    type: "Limousine",
    seatCapacity: 10
  });

  function fetchVehicles() {
    fetch("/api/vehicles")
      .then(res => res.json())
      .then(data => {
        setVehicles(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({ name: "", plateNumber: "", type: "Limousine", seatCapacity: 10 });
    setShowModal(true);
  };

  const handleOpenEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      type: vehicle.type,
      seatCapacity: vehicle.seatCapacity
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : "/api/vehicles";
      const method = editingVehicle ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success(editingVehicle ? "Cập nhật thành công!" : "Đã thêm phương tiện!");
        setShowModal(false);
        fetchVehicles();
      } else {
        toast.error("Lỗi khi lưu");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn ẩn phương tiện này?")) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Đã xóa");
        fetchVehicles();
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    }
  };

  if (loading) return <div className={styles.page}>Đang tải...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}><h1>Quản lý phương tiện</h1><p>Danh sách xe, biển số, loại xe và sức chứa khai thác.</p></div>
        <button 
          onClick={handleOpenAdd}
          className={styles.primary}
        >
          + Thêm Phương tiện
        </button>
      </header>

      <div className={styles.panel}><div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ padding: '16px' }}>Biển số</th>
              <th style={{ padding: '16px' }}>Tên xe</th>
              <th style={{ padding: '16px' }}>Loại xe</th>
              <th style={{ padding: '16px' }}>Số chỗ</th>
              <th style={{ padding: '16px', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr><td colSpan={5} className={styles.empty}>Chưa có phương tiện nào</td></tr>
            )}
            {vehicles.map(v => (
              <tr key={v.id}>
                <td style={{ padding: '16px', fontWeight: 600 }}>{v.plateNumber}</td>
                <td style={{ padding: '16px' }}>{v.name}</td>
                <td style={{ padding: '16px' }}>{v.type}</td>
                <td style={{ padding: '16px' }}>{v.seatCapacity} ghế</td>
                <td><div className={styles.actions}>
                  <button className={styles.edit} onClick={() => handleOpenEdit(v)}>Sửa</button>
                  <button className={styles.delete} onClick={() => handleDelete(v.id)}>Xóa</button>
                </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>

      {showModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem' }}>{editingVehicle ? "Sửa thông tin xe" : "Thêm Xe mới"}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label>Biển số xe</label>
                <input required type="text" className={styles.input} value={formData.plateNumber} onChange={e => setFormData({...formData, plateNumber: e.target.value})} placeholder="VD: 51B-123.45" />
              </div>
              <div className={styles.field}>
                <label>Tên xe / Số tài</label>
                <input required type="text" className={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="VD: Xe 01" />
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label>Loại xe</label>
                  <select className={styles.input} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="Limousine">Limousine</option>
                    <option value="MU-X">MU-X</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Số ghế</label>
                  <input required type="number" min="4" max="45" className={styles.input} value={formData.seatCapacity} onChange={e => setFormData({...formData, seatCapacity: parseInt(e.target.value)})} />
                </div>
              </div>
              
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} className={styles.secondary}>Hủy</button>
                <button type="submit" className={styles.primary}>Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
