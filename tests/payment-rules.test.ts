import test from 'node:test';
import assert from 'node:assert/strict';
import { isBookingPaymentStatus, paymentMethodForStatus } from '../src/lib/payment-rules';

test('booking payment method is derived from its status', () => {
  assert.equal(paymentMethodForStatus('PAID'), 'TRANSFER');
  assert.equal(paymentMethodForStatus('UNPAID'), 'CASH');
});

test('booking payment status rejects unsupported partial state', () => {
  assert.equal(isBookingPaymentStatus('PAID'), true);
  assert.equal(isBookingPaymentStatus('UNPAID'), true);
  assert.equal(isBookingPaymentStatus('PARTIAL'), false);
});
