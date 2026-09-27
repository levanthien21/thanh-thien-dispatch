export type BookingPaymentStatus = 'UNPAID' | 'PAID';
export type BookingPaymentMethod = 'CASH' | 'TRANSFER';

export function isBookingPaymentStatus(value: unknown): value is BookingPaymentStatus {
  return value === 'UNPAID' || value === 'PAID';
}

export function paymentMethodForStatus(status: BookingPaymentStatus): BookingPaymentMethod {
  return status === 'PAID' ? 'TRANSFER' : 'CASH';
}
