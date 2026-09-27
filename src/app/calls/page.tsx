"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "../booking/page.module.css"; 
import callStyles from "./calls.module.css";

const FULL_TRANSCRIPT = [
  { role: "assistant", text: "Dạ tổng đài nhà xe Thanh Thiện xin nghe." },
  { role: "user", text: "Alo, cho mình đặt 1 vé từ Chu Lai ra Đà Nẵng chuyến 3h chiều nay nhé." },
  { role: "assistant", text: "Dạ 15h chiều nay Chu Lai đi Đà Nẵng, anh đi 1 người đúng không ạ?" },
  { role: "user", text: "Đúng rồi, mình tên Hùng, số đuôi 1234, đón ở sân bay Chu Lai nhé." },
  { role: "assistant", text: "Dạ vâng anh Hùng, em đã lên lịch, xe sẽ đón anh ở sân bay Chu Lai lúc 15h." }
];

export default function CallsPage() {
  const [transcript, setTranscript] = useState<{role: string, text: string}[]>([]);
  const [extractedData, setExtractedData] = useState({
    name: "",
    phone: "",
    route: "",
    time: "",
    pickup: "",
    pax: 1
  });
  const [simulating, setSimulating] = useState(false);
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const startSimulation = () => {
    setTranscript([]);
    setExtractedData({ name: "", phone: "", route: "", time: "", pickup: "", pax: 1 });
    setSimulating(true);

    let step = 0;
    const interval = setInterval(() => {
      setTranscript(prev => [...prev, FULL_TRANSCRIPT[step]]);
      
      // AI Extraction magic based on step
      if (step === 1) {
        setExtractedData(prev => ({ ...prev, route: "Chu Lai → Đà Nẵng", time: "15:00", pax: 1 }));
      }
      if (step === 3) {
        setExtractedData(prev => ({ ...prev, name: "Hùng", phone: "09xx xxx 1234", pickup: "Sân bay Chu Lai" }));
      }

      step++;
      if (step >= FULL_TRANSCRIPT.length) {
        clearInterval(interval);
        setSimulating(false);
      }
    }, 1500); // 1.5s per message
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI Trợ Lý Cuộc Gọi (Live Simulator)</h1>
        <div className={styles.btnGroup}>
          <button className={styles.btnSecondary} onClick={() => setTranscript([])} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Kết thúc cuộc gọi</button>
          <button className={styles.btnPrimary} onClick={startSimulation} disabled={simulating}>
            {simulating ? "Đang gọi..." : "Mô phỏng gọi tới"}
          </button>
        </div>
      </header>

      <div className={callStyles.splitPane}>
        <div className={callStyles.pane}>
          <h2 className={styles.sectionTitle}>Phiên dịch thời gian thực (Live Transcript)</h2>
          <div className={callStyles.chatBox}>
            {transcript.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>Đang chờ cuộc gọi...</div>}
            {transcript.map((msg, idx) => (
              <div key={idx} className={`${callStyles.message} ${msg.role === 'assistant' ? callStyles.assistantMsg : callStyles.userMsg}`}>
                <span className={callStyles.sender}>{msg.role === 'assistant' ? 'Tổng đài' : 'Khách hàng'}</span>
                <p>{msg.text}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className={callStyles.pane}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Thông tin AI trích xuất</span>
            {transcript.length > 0 && <span style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 'normal' }}>⚡ Độ tin cậy: 95%</span>}
          </h2>
          
          <form className={styles.bookingForm} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tên khách hàng</label>
              <input type="text" className={styles.input} value={extractedData.name} readOnly />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Số điện thoại</label>
              <input type="text" className={styles.input} value={extractedData.phone} readOnly />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Tuyến đường</label>
              <input type="text" className={styles.input} value={extractedData.route} readOnly />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Giờ đi</label>
                <input type="text" className={styles.input} value={extractedData.time} readOnly />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Số lượng</label>
                <input type="number" className={styles.input} value={extractedData.pax} readOnly />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Điểm đón</label>
              <input type="text" className={styles.input} value={extractedData.pickup} readOnly />
            </div>

            <div className={styles.btnGroup} style={{ marginTop: 'auto' }}>
              <button 
                type="button" 
                className={styles.btnPrimary} 
                style={{ width: '100%' }} 
                disabled={!extractedData.phone}
                onClick={() => {
                  const query = new URLSearchParams();
                  query.set('name', extractedData.name);
                  query.set('phone', extractedData.phone);
                  if (extractedData.route) query.set('route', extractedData.route);
                  if (extractedData.pickup) query.set('pickup', extractedData.pickup);
                  router.push(`/booking?${query.toString()}`);
                }}
              >
                Xác nhận & Tạo Booking
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
