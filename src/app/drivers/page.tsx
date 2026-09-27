"use client";

import { useState, useEffect } from "react";
import styles from "../management.module.css";
import toast from "react-hot-toast";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    licenseNumber: ""
  });

  function fetchDrivers() {
    fetch("/api/drivers")
      .then(res => res.json())
      .then(data => {
        setDrivers(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setFormData({ name: "", phone: "", licenseNumber: "" });
    setShowModal(true);
  };

  const handleOpenEdit = (driver: any) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingDriver ? `/api/drivers/${editingDriver.id}` : "/api/drivers";
      const method = editingDriver ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success(editingDriver ? "Cập nhật thành công!" : "Đã thêm tài xế!");
        setShowModal(false);
        fetchDrivers();
      } else {
        toast.error("Lỗi khi lưu");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn ẩn tài xế này?")) return;
    try {
      const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Đã xóa");
        fetchDrivers();
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    }
  };

  if (loading) return <div className={styles.page}>Đang tải...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}><h1>Quản lý tài xế</h1><p>Hồ sơ tài xế và thông tin bằng lái đang hoạt động.</p></div>
        <button onClick={handleOpenAdd} className={styles.primary}>
          + Thêm Tài xế
        </button>
      </header>

      <div className={styles.panel}><div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ padding: '16px' }}>Họ tên</th>
              <th style={{ padding: '16px' }}>Số điện thoại</th>
              <th style={{ padding: '16px' }}>Bằng lái</th>
              <th style={{ padding: '16px', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 && (
              <tr><td colSpan={4} className={styles.empty}>Chưa có tài xế nào</td></tr>
            )}
            {drivers.map(d => (
              <tr key={d.id}>
                <td style={{ padding: '16px', fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: '16px' }}>{d.phone}</td>
                <td style={{ padding: '16px' }}>{d.licenseNumber || '-'}</td>
                <td><div className={styles.actions}>
                  <button className={styles.edit} onClick={() => handleOpenEdit(d)}>Sửa</button>
                  <button className={styles.delete} onClick={() => handleDelete(d.id)}>Xóa</button>
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
            <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem' }}>{editingDriver ? "Sửa thông tin" : "Thêm Tài xế mới"}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label>Họ và tên</label>
                <input required type="text" className={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className={styles.field}>
                <label>Số điện thoại</label>
                <input required type="text" className={styles.input} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className={styles.field}>
                <label>Số bằng lái (không bắt buộc)</label>
                <input type="text" className={styles.input} value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} />
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
