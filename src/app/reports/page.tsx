"use client";

import { useState, useEffect } from "react";
import styles from "../booking/page.module.css";
import reportStyles from "./reports.module.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Default date range: Last 7 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, groupBy]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const exportToCSV = () => {
    if (!data || !data.tripStats) return;
    const headers = ['Ngày', 'Tuyến đường', 'Giờ chạy', 'Khách', 'Tiền Vé', 'Hàng', 'Tiền Hàng', 'Tổng cộng'];
    const rows = data.tripStats.map((t: any) => [
      new Date(t.date).toLocaleDateString('vi-VN'),
      t.routeName,
      t.time,
      t.passengers,
      t.ticketRevenue,
      t.parcels,
      t.parcelRevenue,
      t.total
    ]);
    
    let csvContent = headers.join(',') + '\n' + rows.map((e: any[]) => e.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Doanh_Thu_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
        <h1 className={styles.title}>Báo cáo & Thống kê</h1>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--bg-panel)', padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Từ ngày:</label>
            <input 
              type="date" 
              className={styles.input} 
              style={{ width: 'auto', marginBottom: 0 }}
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Đến ngày:</label>
            <input 
              type="date" 
              className={styles.input} 
              style={{ width: 'auto', marginBottom: 0 }}
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Hiển thị theo:</label>
            <select 
              className={styles.input} 
              style={{ width: 'auto', marginBottom: 0 }}
              value={groupBy}
              onChange={e => setGroupBy(e.target.value)}
            >
              <option value="day">Ngày</option>
              <option value="month">Tháng</option>
              <option value="year">Năm</option>
            </select>
          </div>
          <button className={styles.btnPrimary} style={{ backgroundColor: '#10b981' }} onClick={exportToCSV}>Xuất Excel</button>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải dữ liệu báo cáo...</div>
      ) : data ? (
        <>
          {/* Metrics Grid */}
          <div className={reportStyles.grid} style={{ marginBottom: '32px' }}>
            <div className={reportStyles.card}>
              <h3 className={reportStyles.cardTitle}>Tổng Chuyến Xe</h3>
              <p className={reportStyles.cardValue}>{data.totalTrips}</p>
            </div>
            <div className={reportStyles.card}>
              <h3 className={reportStyles.cardTitle}>Số Khách / Hàng</h3>
              <p className={reportStyles.cardValue} style={{ color: 'var(--primary)' }}>
                {data.totalPassengers} khách / {data.parcelCount} kiện
              </p>
            </div>
            <div className={reportStyles.card}>
              <h3 className={reportStyles.cardTitle}>Giá trị vé đã bán</h3>
              <p className={reportStyles.cardValue} style={{ color: 'var(--info)' }}>
                {formatCurrency(data.ticketRevenue)}
              </p>
            </div>
            <div className={reportStyles.card}>
              <h3 className={reportStyles.cardTitle}>Tiền vé đã thu</h3>
              <p className={reportStyles.cardValue} style={{ color: 'var(--success)' }}>{formatCurrency(data.ticketCollected)}</p>
            </div>
            <div className={reportStyles.card}>
              <h3 className={reportStyles.cardTitle}>Công nợ vé</h3>
              <p className={reportStyles.cardValue} style={{ color: 'var(--danger)' }}>{formatCurrency(data.ticketOutstanding)}</p>
            </div>
            <div className={reportStyles.card}>
              <h3 className={reportStyles.cardTitle}>Doanh Thu Ký Gửi</h3>
              <p className={reportStyles.cardValue} style={{ color: '#f59e0b' }}>
                {formatCurrency(data.parcelRevenue)}
              </p>
            </div>
            <div className={reportStyles.card} style={{ gridColumn: 'span 2' }}>
              <h3 className={reportStyles.cardTitle}>Tổng Doanh Thu (Vé + Hàng)</h3>
              <p className={reportStyles.cardValue} style={{ color: 'var(--success)' }}>
                {formatCurrency(data.totalRevenue)}
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
            {/* Bar Chart */}
            <div className={reportStyles.card}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--text-base)' }}>Biểu đồ Doanh Thu Theo Thời Gian</h3>
              <div style={{ height: '400px', width: '100%' }}>
                {data.chartData && data.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartData} margin={{ top: 35, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickLine={{ stroke: '#334155' }}
                        axisLine={{ stroke: '#334155' }}
                        tickFormatter={(val) => {
                          if (groupBy === 'month') return `Tháng ${val.substring(5, 7)}/${val.substring(0, 4)}`;
                          if (groupBy === 'year') return `Năm ${val}`;
                          return new Date(val).toLocaleDateString('vi-VN');
                        }}
                      />
                      <YAxis 
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickLine={{ stroke: '#334155' }}
                        axisLine={{ stroke: '#334155' }}
                        tickFormatter={(val) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(val)}
                      />
                      <Tooltip 
                        shared={false}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '8px' }}
                        itemStyle={{ color: '#f8fafc' }}
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                        labelFormatter={(label) => {
                          if (groupBy === 'month') return `Tháng: ${label}`;
                          if (groupBy === 'year') return `Năm: ${label}`;
                          return `Ngày: ${new Date(String(label)).toLocaleDateString('vi-VN')}`;
                        }}
                      />
                    <Legend wrapperStyle={{ color: '#f8fafc' }} />
                    <Bar dataKey="ticketRevenue" name="Bán vé" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      <LabelList 
                        dataKey="ticketRevenue" 
                        position="top" 
                        fill="#f8fafc" 
                        fontSize={12} 
                        fontWeight={600}
                        formatter={(val) => Number(val) > 0 ? new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(Number(val)) : ''} 
                      />
                    </Bar>
                    <Bar dataKey="parcelRevenue" name="Ký gửi" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      <LabelList 
                        dataKey="parcelRevenue" 
                        position="top" 
                        fill="#f8fafc" 
                        fontSize={12} 
                        fontWeight={600}
                        formatter={(val) => Number(val) > 0 ? new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(Number(val)) : ''} 
                      />
                    </Bar>
                  </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Không có dữ liệu trong khoảng thời gian này
                  </div>
                )}
              </div>
            </div>
            
            {/* Pie Chart */}
            <div className={reportStyles.card}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--text-base)' }}>Cơ cấu Doanh Thu</h3>
              <div style={{ height: '400px', width: '100%' }}>
                {data.totalRevenue > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Bán vé', value: data.ticketRevenue },
                          { name: 'Ký gửi', value: data.parcelRevenue }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        isAnimationActive={false}
                        label={({ name, percent }) => (percent ?? 0) > 0 ? `${name}: ${((percent ?? 0) * 100).toFixed(0)}%` : ''}
                        labelLine={{ stroke: '#9ca3af' }}
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '8px' }}
                        itemStyle={{ color: '#f8fafc' }}
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                      />
                      <Legend wrapperStyle={{ color: '#f8fafc' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Chưa có doanh thu
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Route Performance Chart */}
          <div className={reportStyles.card} style={{ marginBottom: '32px' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--text-base)' }}>Doanh Thu Theo Tuyến Đường</h3>
            <div style={{ height: `${Math.max(300, (data.routeStats?.length || 0) * 60)}px`, width: '100%' }}>
              {data.routeStats && data.routeStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.routeStats} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                    <XAxis type="number" tickFormatter={(val) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(val)} tick={{ fill: '#9ca3af' }} />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#f8fafc', fontSize: 13 }} />
                    <Tooltip 
                      shared={false}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '8px' }}
                      itemStyle={{ color: '#f8fafc' }}
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                    />
                    <Legend wrapperStyle={{ color: '#f8fafc' }} />
                    <Bar dataKey="ticketRevenue" name="Bán vé" stackId="a" fill="#3b82f6" isAnimationActive={false} />
                    <Bar dataKey="parcelRevenue" name="Ký gửi" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      <LabelList 
                        dataKey="totalRevenue" 
                        position="right" 
                        fill="#10b981" 
                        fontSize={13} 
                        fontWeight={600}
                        formatter={(val) => formatCurrency(Number(val ?? 0))} 
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Không có dữ liệu tuyến đường
                </div>
              )}
            </div>
          </div>

          {/* Top Customers & Driver Performance Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            {/* Top Customers */}
            <div className={reportStyles.card}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--text-base)' }}>Top 5 Khách Hàng VIP</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '16px 8px' }}>Khách hàng</th>
                      <th style={{ padding: '16px 8px', textAlign: 'center' }}>Số vé</th>
                      <th style={{ padding: '16px 8px', textAlign: 'right' }}>Tổng chi tiêu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers?.length === 0 && (
                      <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center' }}>Chưa có dữ liệu</td></tr>
                    )}
                    {data.topCustomers?.map((c: any, index: number) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {index === 0 && <span title="Top 1">🥇</span>}
                            {index === 1 && <span title="Top 2">🥈</span>}
                            {index === 2 && <span title="Top 3">🥉</span>}
                            {c.name}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.phone}</div>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{c.ticketsCount}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                          {formatCurrency(c.totalSpent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Driver Performance */}
            <div className={reportStyles.card}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--text-base)' }}>Hiệu suất Tài xế</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '16px 8px' }}>Tài xế</th>
                      <th style={{ padding: '16px 8px', textAlign: 'center' }}>Số chuyến</th>
                      <th style={{ padding: '16px 8px', textAlign: 'right' }}>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.driverStats?.length === 0 && (
                      <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center' }}>Chưa có dữ liệu</td></tr>
                    )}
                    {data.driverStats?.map((d: any) => (
                      <tr key={d.name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 600 }}>{d.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{d.phone}</div>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{d.tripsCount}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--info)', fontWeight: 600 }}>
                          {formatCurrency(d.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Trip Stats Table */}
          <div className={reportStyles.card}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--text-base)' }}>Chi tiết Doanh thu theo Chuyến xe</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '16px 8px' }}>Ngày / Giờ</th>
                    <th style={{ padding: '16px 8px' }}>Tuyến đường</th>
                    <th style={{ padding: '16px 8px', textAlign: 'center' }}>Khách</th>
                    <th style={{ padding: '16px 8px', textAlign: 'right' }}>Tiền Vé</th>
                    <th style={{ padding: '16px 8px', textAlign: 'center' }}>Hàng</th>
                    <th style={{ padding: '16px 8px', textAlign: 'right' }}>Tiền Hàng</th>
                    <th style={{ padding: '16px 8px', textAlign: 'right' }}>Tổng cộng</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tripStats.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center' }}>Không có chuyến xe nào</td></tr>
                  )}
                  {data.tripStats.map((t: any) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 600 }}>{new Date(t.date).toLocaleDateString('vi-VN')}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.time}</div>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t.routeName}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>{t.passengers}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--primary)', fontWeight: 500 }}>
                        {formatCurrency(t.ticketRevenue)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>{t.parcels}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#f59e0b', fontWeight: 500 }}>
                        {formatCurrency(t.parcelRevenue)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                        {formatCurrency(t.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
