"use client";

import { useRouter } from "next/navigation";

export default function SearchFilters({ timeRange, startDate, endDate, startTime, endTime, q, type }: { timeRange: string, startDate: string, endDate: string, startTime: string, endTime: string, q: string, type: string }) {
  const router = useRouter();

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeRange = e.target.value;
    router.push(`/search?type=${type}&q=${q}&timeRange=${newTimeRange}&startDate=&endDate=&startTime=${startTime}&endTime=${endTime}`);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    router.push(`/search?type=${type}&q=${q}&timeRange=all&startDate=${newDate}&endDate=${endDate}&startTime=${startTime}&endTime=${endTime}`);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    router.push(`/search?type=${type}&q=${q}&timeRange=all&startDate=${startDate}&endDate=${newDate}&startTime=${startTime}&endTime=${endTime}`);
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    router.push(`/search?type=${type}&q=${q}&timeRange=${timeRange}&startDate=${startDate}&endDate=${endDate}&startTime=${newTime}&endTime=${endTime}`);
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    router.push(`/search?type=${type}&q=${q}&timeRange=${timeRange}&startDate=${startDate}&endDate=${endDate}&startTime=${startTime}&endTime=${newTime}`);
  };

  const handleClearTimeRange = () => {
    router.push(`/search?type=${type}&q=${q}&timeRange=${timeRange}&startDate=${startDate}&endDate=${endDate}&startTime=&endTime=`);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'var(--bg-panel)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', width: '100%', overflowX: 'auto', whiteSpace: 'nowrap' }}>
      {/* Block 1: Time Range Select */}
      <select 
        value={timeRange}
        onChange={handleTimeRangeChange}
        style={{ padding: '8px 12px', border: 'none', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 600 }}
      >
        <option value="all">Tất cả thời gian</option>
        <option value="day">Hôm nay</option>
        <option value="week">Tuần này</option>
        <option value="month">Tháng này</option>
        <option value="year">Năm nay</option>
      </select>

      <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>

      {/* Block 2: Date Range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input 
          type="date" 
          value={startDate}
          onChange={handleStartDateChange}
          style={{ padding: '8px 12px', border: 'none', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 600 }}
          title="Từ ngày"
        />
        <span style={{ color: 'var(--text-muted)' }}>→</span>
        <input 
          type="date" 
          value={endDate}
          onChange={handleEndDateChange}
          style={{ padding: '8px 12px', border: 'none', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 600 }}
          title="Đến ngày"
        />
      </div>
      
      <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>

      {/* Block 3: Time Range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '8px' }}>Giờ đi:</span>
        <input 
          type="time" 
          value={startTime}
          onChange={handleStartTimeChange}
          style={{ padding: '8px 8px', border: 'none', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 600 }}
          title="Từ giờ"
        />
        <span style={{ color: 'var(--text-muted)' }}>-</span>
        <input 
          type="time" 
          value={endTime}
          onChange={handleEndTimeChange}
          style={{ padding: '8px 8px', border: 'none', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 600 }}
          title="Đến giờ"
        />
        {(startTime || endTime) && (
          <button 
            type="button" 
            onClick={handleClearTimeRange}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#ef4444', padding: '0 4px', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
            title="Xóa giờ"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
