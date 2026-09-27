export const PHONE_PATTERN = /^(?:0\d{9}|84\d{9})$/;
export const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizePhone(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

export function parseDateInput(value: unknown, endOfDay = false): Date | null {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function validMoney(value: unknown, max = 1_000_000_000): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= max ? Math.round(amount) : null;
}

export function applyPriceAdjustment(base: number, type: string, value: number, mode: string): number {
  const adjustment = type === 'PERCENTAGE' ? base * value / 100 : value;
  return Math.round(mode === 'INCREASE' ? base + adjustment : Math.max(0, base - adjustment));
}

export function validRole(value: unknown): value is 'AGENT' | 'DISPATCHER' | 'ADMIN' {
  return typeof value === 'string' && ['AGENT', 'DISPATCHER', 'ADMIN'].includes(value);
}

export function chooseAvailableVehicle<T extends { id: string; type: string }>(vehicles: T[], occupiedIds: Set<string>, requiredType?: string | null, reservedTypes = new Set<string>()): T | null {
  const available = vehicles.filter((vehicle) => !occupiedIds.has(vehicle.id));
  if (requiredType) return available.find((vehicle) => vehicle.type === requiredType) ?? null;
  return available.find((vehicle) => !reservedTypes.has(vehicle.type)) ?? available[0] ?? null;
}

export function tripDepartureAt(travelDate: Date | string, departureTime: string): Date {
  const departure = new Date(travelDate);
  const [hours, minutes] = departureTime.split(':').map(Number);
  departure.setHours(hours, minutes, 0, 0);
  return departure;
}

export function canAcceptTripBookings(travelDate: Date | string, departureTime: string, status: string, now = new Date()): boolean {
  return status === 'SCHEDULED' && tripDepartureAt(travelDate, departureTime).getTime() > now.getTime();
}
