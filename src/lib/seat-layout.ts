export type SeatDefinition = { id: string; label?: string; type: 'driver' | 'seat'; empty: boolean };
export type SeatRow = SeatDefinition[];

export const SEAT_LAYOUTS: Record<'MU-X' | 'Limousine', SeatRow[]> = {
  'MU-X': [
    [{ id: 'DRIVER', label: 'Tài xế', type: 'driver', empty: false }, { id: 'empty1', empty: true, type: 'seat' }, { id: 'A1', label: 'Ghế phụ', type: 'seat', empty: false }],
    [{ id: 'B1', label: 'Giữa trái', type: 'seat', empty: false }, { id: 'B2', label: 'Giữa', type: 'seat', empty: false }, { id: 'B3', label: 'Giữa phải', type: 'seat', empty: false }],
    [{ id: 'empty2', empty: true, type: 'seat' }, { id: 'C1', label: 'Sau trái', type: 'seat', empty: false }, { id: 'C2', label: 'Sau phải', type: 'seat', empty: false }],
  ],
  Limousine: [
    [{ id: 'DRIVER', label: 'Tài xế', type: 'driver', empty: false }, { id: 'A1', label: 'Phụ 1', type: 'seat', empty: false }, { id: 'A2', label: 'Phụ 2', type: 'seat', empty: false }],
    [{ id: 'empty3', empty: true, type: 'seat' }, { id: 'B1', label: 'VIP 1', type: 'seat', empty: false }, { id: 'B2', label: 'VIP 2', type: 'seat', empty: false }],
    [{ id: 'empty4', empty: true, type: 'seat' }, { id: 'C1', label: 'VIP 3', type: 'seat', empty: false }, { id: 'C2', label: 'VIP 4', type: 'seat', empty: false }],
    [{ id: 'D1', label: 'Sau 1', type: 'seat', empty: false }, { id: 'D2', label: 'Sau 2', type: 'seat', empty: false }, { id: 'D3', label: 'Sau 3', type: 'seat', empty: false }],
  ],
};

export function layoutKey(vehicleType: string): 'MU-X' | 'Limousine' {
  return vehicleType.toLowerCase().includes('mu-x') || vehicleType.toLowerCase().includes('7') ? 'MU-X' : 'Limousine';
}

export function validSeatNumbers(vehicleType: string): string[] {
  return SEAT_LAYOUTS[layoutKey(vehicleType)].flat().filter((seat) => seat.type === 'seat' && !seat.empty).map((seat) => seat.id);
}
