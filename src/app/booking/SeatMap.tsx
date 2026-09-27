import { Armchair, CarFront } from 'lucide-react';
import { layoutKey, SEAT_LAYOUTS } from '@/lib/seat-layout';
import styles from './SeatMap.module.css';

export default function SeatMap({ vehicleType, bookedSeatsList, selectedSeats, onToggleSeat }: { vehicleType: string; bookedSeatsList: string[]; selectedSeats: string[]; onToggleSeat: (seatId: string) => void }) {
  const selectedLayout = layoutKey(vehicleType);
  const layout = SEAT_LAYOUTS[selectedLayout];
  return <section className={styles.wrapper} aria-label="Sơ đồ chọn ghế">
    <div className={styles.heading}><div><span>Sơ đồ chỗ ngồi</span><h3>{selectedLayout === 'MU-X' ? 'SUV 7 chỗ' : 'Limousine 10 chỗ'}</h3></div><strong>{selectedSeats.length} ghế đã chọn</strong></div>
    <div className={styles.cabin}>
      <div className={styles.cabinTop}><span>ĐẦU XE</span><CarFront /></div>
      <div className={styles.rows}>{layout.map((row, rowIndex) => <div className={styles.row} key={rowIndex}>{row.map((seat, seatIndex) => {
        if (seat.empty) return <span className={styles.aisle} key={`empty-${seatIndex}`} />;
        const driver = seat.type === 'driver';
        const booked = bookedSeatsList.includes(seat.id);
        const selected = selectedSeats.includes(seat.id);
        return <button type="button" key={seat.id} disabled={driver || booked} onClick={() => onToggleSeat(seat.id)} className={`${styles.seat} ${driver ? styles.driver : ''} ${booked ? styles.booked : ''} ${selected ? styles.selected : ''}`} aria-pressed={selected} title={driver ? 'Vị trí tài xế' : booked ? `Ghế ${seat.id} đã đặt` : `Chọn ghế ${seat.id}`}>
          {driver ? <><CarFront /><strong>Tài xế</strong><small>Vô lăng</small></> : <><Armchair /><strong>{seat.id}</strong>{seat.label && <small>{seat.label}</small>}</>}
        </button>;
      })}</div>)}</div>
    </div>
    <div className={styles.legend}><span><i className={styles.emptySeat} />Ghế trống</span><span><i className={styles.selectedSeat} />Đang chọn</span><span><i className={styles.bookedSeat} />Đã đặt</span><span><i className={styles.driverSeat} />Buồng lái</span></div>
  </section>;
}
