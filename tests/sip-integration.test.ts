import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPath, isProtectedPath } from '../src/lib/access';
import { normalizePhone, PHONE_PATTERN } from '../src/lib/business-rules';

test('SIP settings access is restricted to ADMIN only', () => {
  for (const path of ['/settings/sip', '/api/settings/sip']) {
    assert.equal(canAccessPath('ADMIN', path), true, `ADMIN should access ${path}`);
    assert.equal(canAccessPath('DISPATCHER', path), false, `DISPATCHER should NOT access ${path}`);
    assert.equal(canAccessPath('AGENT', path), false, `AGENT should NOT access ${path}`);
  }
});

test('Calls center station is accessible to all operating roles', () => {
  assert.equal(canAccessPath('AGENT', '/calls'), true, 'AGENT should access /calls');
  assert.equal(canAccessPath('DISPATCHER', '/calls'), true, 'DISPATCHER should access /calls');
  assert.equal(canAccessPath('ADMIN', '/calls'), true, 'ADMIN should access /calls');
  assert.equal(canAccessPath('AGENT', '/api/calls'), true, 'AGENT should access /api/calls');
  assert.equal(isProtectedPath('/calls'), true, '/calls should be protected');
});

test('Phone normalization strips display separators and validates against PHONE_PATTERN', () => {
  const variations = [
    { input: '0867 75 79 75', expected: '0867757975' },
    { input: '0867-75-79-75', expected: '0867757975' },
    { input: '0867.75.79.75', expected: '0867757975' },
    { input: ' 0867 757 975 ', expected: '0867757975' },
    { input: '+84867757975', expected: '84867757975' }
  ];

  for (const item of variations) {
    const normalized = normalizePhone(item.input);
    assert.equal(normalized, item.expected, `Failed to normalize ${item.input}`);
    assert.equal(PHONE_PATTERN.test(normalized), true, `Failed pattern for ${normalized}`);
  }
});
