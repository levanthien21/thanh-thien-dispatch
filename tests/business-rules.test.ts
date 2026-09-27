import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPriceAdjustment, canAcceptTripBookings, chooseAvailableVehicle, normalizePhone, parseDateInput, TIME_PATTERN, validMoney, validRole } from '../src/lib/business-rules';
import { validSeatNumbers } from '../src/lib/seat-layout';

test('normalizePhone strips display separators', () => {
  assert.equal(normalizePhone('0912 345-678'), '0912345678');
});

test('parseDateInput rejects impossible and ambiguous dates', () => {
  assert.equal(parseDateInput('2026-02-30'), null);
  assert.equal(parseDateInput('19/08/2026'), null);
  const date = parseDateInput('2026-08-19');
  assert.ok(date);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 7);
  assert.equal(date.getDate(), 19);
  assert.equal(date.getHours(), 0);
});

test('price adjustments round and never create a negative price', () => {
  assert.equal(applyPriceAdjustment(130_000, 'PERCENTAGE', 20, 'INCREASE'), 156_000);
  assert.equal(applyPriceAdjustment(130_000, 'FIXED', 200_000, 'DECREASE'), 0);
});

test('money, time and roles enforce bounded values', () => {
  assert.equal(validMoney(-1), null);
  assert.equal(validMoney('130000'), 130_000);
  assert.equal(TIME_PATTERN.test('23:59'), true);
  assert.equal(TIME_PATTERN.test('24:00'), false);
  assert.equal(validRole('ADMIN'), true);
  assert.equal(validRole('OWNER'), false);
});

test('seat layouts expose exactly the passenger capacity used by the UI', () => {
  assert.deepEqual(validSeatNumbers('MU-X'), ['A1', 'B1', 'B2', 'B3', 'C1', 'C2']);
  assert.equal(validSeatNumbers('Limousine').length, 9);
  assert.equal(validSeatNumbers('MU-X').includes('DRIVER'), false);
});

test('vehicle assignment respects type and exact-time occupancy', () => {
  const vehicles = [{ id: 'limo', type: 'Limousine' }, { id: 'mux', type: 'MU-X' }];
  assert.equal(chooseAvailableVehicle(vehicles, new Set(['limo']), 'Limousine'), null);
  assert.equal(chooseAvailableVehicle(vehicles, new Set(['limo']), null)?.id, 'mux');
  assert.equal(chooseAvailableVehicle(vehicles, new Set(), 'MU-X')?.id, 'mux');
});

test('flexible schedules preserve vehicles reserved by fixed schedules', () => {
  const vehicles = [
    { id: 'limousine', type: 'Limousine' },
    { id: 'mux', type: 'MU-X' },
  ];
  const selected = chooseAvailableVehicle(vehicles, new Set(), null, new Set(['Limousine']));
  assert.equal(selected?.id, 'mux');
});

test('trips stop accepting new or transferred bookings at departure time', () => {
  const now = new Date(2026, 7, 19, 14, 0, 0);
  const date = new Date(2026, 7, 19);
  assert.equal(canAcceptTripBookings(date, '13:59', 'SCHEDULED', now), false);
  assert.equal(canAcceptTripBookings(date, '14:00', 'SCHEDULED', now), false);
  assert.equal(canAcceptTripBookings(date, '16:00', 'SCHEDULED', now), true);
  assert.equal(canAcceptTripBookings(date, '16:00', 'COMPLETED', now), false);
  assert.equal(canAcceptTripBookings(date, '16:00', 'IN_PROGRESS', now), false);
});
