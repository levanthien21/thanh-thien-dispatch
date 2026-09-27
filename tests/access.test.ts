import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPath, isProtectedPath, isPublicPath } from '../src/lib/access';

test('role matrix protects system administration', () => {
  for (const path of ['/settings', '/settings/prices', '/api/settings/prices', '/api/users', '/api/audit-logs']) {
    assert.equal(canAccessPath('ADMIN', path), true);
    assert.equal(canAccessPath('DISPATCHER', path), false);
    assert.equal(canAccessPath('AGENT', path), false);
  }
});

test('fleet management is available to dispatcher and admin only', () => {
  assert.equal(canAccessPath('ADMIN', '/drivers'), true);
  assert.equal(canAccessPath('DISPATCHER', '/vehicles'), true);
  assert.equal(canAccessPath('AGENT', '/drivers'), false);
  assert.equal(canAccessPath('AGENT', '/api/drivers', 'GET'), true);
  assert.equal(canAccessPath('AGENT', '/api/drivers', 'POST'), false);
});

test('route classification identifies exact public paths and allowed subpaths', () => {
  const publicCases = [
    '/login',
    '/login/',
    '/login/reset',
    '/api/auth/login',
    '/api/auth/login/',
    '/api/auth/login/callback',
    '/api/auth/setup',
    '/api/auth/setup/',
    '/api/auth/setup/verify',
  ];

  for (const path of publicCases) {
    assert.equal(isPublicPath(path), true, `expected ${path} to be public`);
    assert.equal(isProtectedPath(path), false, `expected ${path} not to be protected`);
  }
});

test('route classification rejects deceptive prefixes and similarly prefixed paths', () => {
  const deceptiveCases = [
    '/login-anything',
    '/login_attempt',
    '/login.json',
    '/api/auth/login-admin',
    '/api/auth/login_check',
    '/api/auth/login.json',
    '/api/auth/setup-admin',
    '/api/auth/setup_new',
    '/api/auth/setup.json',
    '/api/auth/logins',
  ];

  for (const path of deceptiveCases) {
    assert.equal(isPublicPath(path), false, `expected deceptive path ${path} not to be public`);
    assert.equal(isProtectedPath(path), true, `expected deceptive path ${path} to be protected`);
  }
});

test('route classification identifies ordinary protected page and API paths', () => {
  const protectedCases = [
    '/',
    '/booking',
    '/calls',
    '/customers',
    '/drivers',
    '/notifications',
    '/parcels',
    '/profile',
    '/reports',
    '/search',
    '/settings',
    '/trips',
    '/vehicles',
    '/api/bookings',
    '/api/customers',
    '/api/drivers',
    '/api/vehicles',
    '/api/trips',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/reports',
    '/api/routes',
  ];

  for (const path of protectedCases) {
    assert.equal(isPublicPath(path), false, `expected protected path ${path} not to be public`);
    assert.equal(isProtectedPath(path), true, `expected protected path ${path} to be protected`);
  }
});

test('role boundary matrix covers settings, audit, fleet pages, and fleet operations', () => {
  const matrix = [
    // Settings & system management (ADMIN only)
    { path: '/settings', method: 'GET', expected: { AGENT: false, DISPATCHER: false, ADMIN: true } },
    { path: '/settings/prices', method: 'GET', expected: { AGENT: false, DISPATCHER: false, ADMIN: true } },
    { path: '/settings/accounts', method: 'GET', expected: { AGENT: false, DISPATCHER: false, ADMIN: true } },
    { path: '/settings/audit', method: 'GET', expected: { AGENT: false, DISPATCHER: false, ADMIN: true } },
    { path: '/api/settings/prices', method: 'GET', expected: { AGENT: false, DISPATCHER: false, ADMIN: true } },
    { path: '/api/settings/prices', method: 'POST', expected: { AGENT: false, DISPATCHER: false, ADMIN: true } },
    { path: '/api/settings/holidays', method: 'GET', expected: { AGENT: false, DISPATCHER: false, ADMIN: true } },
    { path: '/api/users', method: 'GET', expected: { AGENT: false, DISPATCHER: false, ADMIN: true } },
    { path: '/api/users/user-1', method: 'DELETE', expected: { AGENT: false, DISPATCHER: false, ADMIN: true } },
    { path: '/api/audit-logs', method: 'GET', expected: { AGENT: false, DISPATCHER: false, ADMIN: true } },

    // Fleet pages (DISPATCHER and ADMIN only)
    { path: '/drivers', method: 'GET', expected: { AGENT: false, DISPATCHER: true, ADMIN: true } },
    { path: '/drivers/d1', method: 'GET', expected: { AGENT: false, DISPATCHER: true, ADMIN: true } },
    { path: '/vehicles', method: 'GET', expected: { AGENT: false, DISPATCHER: true, ADMIN: true } },
    { path: '/vehicles/v1', method: 'GET', expected: { AGENT: false, DISPATCHER: true, ADMIN: true } },

    // Fleet API reads (All authenticated roles)
    { path: '/api/drivers', method: 'GET', expected: { AGENT: true, DISPATCHER: true, ADMIN: true } },
    { path: '/api/drivers/d1', method: 'GET', expected: { AGENT: true, DISPATCHER: true, ADMIN: true } },
    { path: '/api/vehicles', method: 'GET', expected: { AGENT: true, DISPATCHER: true, ADMIN: true } },
    { path: '/api/vehicles/v1', method: 'GET', expected: { AGENT: true, DISPATCHER: true, ADMIN: true } },

    // Fleet API mutations (DISPATCHER and ADMIN only)
    { path: '/api/drivers', method: 'POST', expected: { AGENT: false, DISPATCHER: true, ADMIN: true } },
    { path: '/api/drivers/d1', method: 'PUT', expected: { AGENT: false, DISPATCHER: true, ADMIN: true } },
    { path: '/api/drivers/d1', method: 'DELETE', expected: { AGENT: false, DISPATCHER: true, ADMIN: true } },
    { path: '/api/vehicles', method: 'POST', expected: { AGENT: false, DISPATCHER: true, ADMIN: true } },
    { path: '/api/vehicles/v1', method: 'PUT', expected: { AGENT: false, DISPATCHER: true, ADMIN: true } },
    { path: '/api/vehicles/v1', method: 'DELETE', expected: { AGENT: false, DISPATCHER: true, ADMIN: true } },

    // Ordinary operational paths (All authenticated roles)
    { path: '/', method: 'GET', expected: { AGENT: true, DISPATCHER: true, ADMIN: true } },
    { path: '/booking', method: 'GET', expected: { AGENT: true, DISPATCHER: true, ADMIN: true } },
    { path: '/trips', method: 'GET', expected: { AGENT: true, DISPATCHER: true, ADMIN: true } },
    { path: '/api/trips', method: 'GET', expected: { AGENT: true, DISPATCHER: true, ADMIN: true } },
    { path: '/api/bookings', method: 'POST', expected: { AGENT: true, DISPATCHER: true, ADMIN: true } },
  ];

  for (const { path, method, expected } of matrix) {
    for (const role of ['AGENT', 'DISPATCHER', 'ADMIN'] as const) {
      assert.equal(
        canAccessPath(role, path, method),
        expected[role],
        `role ${role} accessing ${method} ${path} expected ${expected[role]}`
      );
    }
  }
});
