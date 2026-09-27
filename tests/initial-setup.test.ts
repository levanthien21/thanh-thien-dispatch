import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  hashPassword,
  initializeFirstAdmin,
  needsInitialSetup,
  SetupConflictError,
} from '../src/lib/auth';
import { handleSetup } from '../src/app/api/auth/setup/route';

interface TestContext {
  db: PrismaClient;
  dbPath: string;
  cleanup: () => Promise<void>;
}

function createDisposableDb(): TestContext {
  const dbPath = path.join(os.tmpdir(), `thanhthien-test-${randomUUID()}.db`);
  const sqlite = new Database(dbPath);
  sqlite.exec(`
    CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "phone" TEXT NOT NULL UNIQUE,
      "email" TEXT UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'AGENT',
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE "Session" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "userId" TEXT NOT NULL,
      "expiresAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  sqlite.close();

  const db = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });

  const cleanup = async () => {
    await db.$disconnect();
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const target = dbPath + suffix;
      if (fs.existsSync(target)) {
        try {
          fs.unlinkSync(target);
        } catch {
          // Ignore temp cleanup retry on Windows
        }
      }
    }
  };

  return { db, dbPath, cleanup };
}

test('empty DB first-admin initialization succeeds and creates single active admin', async () => {
  const { db, cleanup } = createDisposableDb();
  try {
    assert.equal(await needsInitialSetup(db), true);

    const passwordHash = await hashPassword('AdminPass12345');
    const result = await initializeFirstAdmin(
      { name: 'Admin Root', phone: '0912345678', passwordHash },
      db
    );

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.ok(result.userId);

    const users = await db.user.findMany();
    assert.equal(users.length, 1);
    assert.equal(users[0].id, result.userId);
    assert.equal(users[0].name, 'Admin Root');
    assert.equal(users[0].phone, '0912345678');
    assert.equal(users[0].role, 'ADMIN');
    assert.equal(users[0].status, 'ACTIVE');
    assert.equal(users[0].passwordHash, passwordHash);

    assert.equal(await needsInitialSetup(db), false);
  } finally {
    await cleanup();
  }
});

test('placeholder user is upgraded to ADMIN with passwordHash when no bcrypt-backed user exists', async () => {
  const { db, cleanup } = createDisposableDb();
  try {
    const oldestId = 'placeholder-old';
    const newerId = 'placeholder-new';

    await db.user.createMany({
      data: [
        {
          id: oldestId,
          name: 'Old Placeholder',
          phone: '0901111111',
          passwordHash: 'unhashed_placeholder_1',
          role: 'AGENT',
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 60000),
        },
        {
          id: newerId,
          name: 'New Placeholder',
          phone: '0902222222',
          passwordHash: 'unhashed_placeholder_2',
          role: 'AGENT',
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 10000),
        },
      ],
    });

    assert.equal(await needsInitialSetup(db), true);

    const passwordHash = await hashPassword('UpgradedPass123');
    const result = await initializeFirstAdmin(
      { name: 'New Admin Name', phone: '0912345679', passwordHash },
      db
    );

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.userId, oldestId);

    const upgraded = await db.user.findUnique({ where: { id: oldestId } });
    assert.ok(upgraded);
    assert.equal(upgraded.name, 'New Admin Name');
    assert.equal(upgraded.phone, '0912345679');
    assert.equal(upgraded.role, 'ADMIN');
    assert.equal(upgraded.status, 'ACTIVE');
    assert.equal(upgraded.passwordHash, passwordHash);

    const untouched = await db.user.findUnique({ where: { id: newerId } });
    assert.ok(untouched);
    assert.equal(untouched.role, 'AGENT');
    assert.equal(untouched.passwordHash, 'unhashed_placeholder_2');

    const bcryptUsers = await db.user.findMany({
      where: { passwordHash: { startsWith: '$2' } },
    });
    assert.equal(bcryptUsers.length, 1);
    assert.equal(await needsInitialSetup(db), false);
  } finally {
    await cleanup();
  }
});

test('subsequent setup attempts fail with conflict when setup is already complete', async () => {
  const { db, cleanup } = createDisposableDb();
  try {
    const passwordHash1 = await hashPassword('InitialPass123');
    const firstResult = await initializeFirstAdmin(
      { name: 'First Admin', phone: '0912345671', passwordHash: passwordHash1 },
      db
    );
    assert.equal(firstResult.success, true);

    const passwordHash2 = await hashPassword('SecondPass123');
    const secondResult = await initializeFirstAdmin(
      { name: 'Second Admin', phone: '0912345672', passwordHash: passwordHash2 },
      db
    );

    assert.equal(secondResult.success, false);
    if (secondResult.success) return;
    assert.equal(secondResult.conflict, true);
    assert.equal(secondResult.code, 'SETUP_CONFLICT');
    assert.equal(secondResult.error, 'Hệ thống đã được khởi tạo');

    const totalAdmins = await db.user.findMany({
      where: { passwordHash: { startsWith: '$2' } },
    });
    assert.equal(totalAdmins.length, 1);
    assert.equal(totalAdmins[0].phone, '0912345671');
  } finally {
    await cleanup();
  }
});

test('concurrent setup attempts deterministically yield exactly one success and one conflict', async () => {
  const { db, cleanup } = createDisposableDb();
  try {
    const hash1 = await hashPassword('Concurrent1Pass');
    const hash2 = await hashPassword('Concurrent2Pass');

    const [res1, res2] = await Promise.all([
      initializeFirstAdmin({ name: 'Admin 1', phone: '0912345681', passwordHash: hash1 }, db),
      initializeFirstAdmin({ name: 'Admin 2', phone: '0912345682', passwordHash: hash2 }, db),
    ]);

    const results = [res1, res2];
    const successes = results.filter((r) => r.success);
    const conflicts = results.filter((r) => !r.success);

    assert.equal(successes.length, 1, 'Expected exactly one setup attempt to succeed');
    assert.equal(conflicts.length, 1, 'Expected exactly one setup attempt to receive conflict');

    if (!conflicts[0].success) {
      assert.equal(conflicts[0].conflict, true);
      assert.equal(conflicts[0].code, 'SETUP_CONFLICT');
      assert.equal(conflicts[0].error, 'Hệ thống đã được khởi tạo');
    }

    const bcryptUsers = await db.user.findMany({
      where: { passwordHash: { startsWith: '$2' } },
    });
    assert.equal(bcryptUsers.length, 1);
    assert.equal(bcryptUsers[0].role, 'ADMIN');
  } finally {
    await cleanup();
  }
});

test('repeated concurrency iterations deterministically produce single admin without corruption', async () => {
  const ITERATIONS = 8;
  const hash1 = await hashPassword('RepeatTestPass1');
  const hash2 = await hashPassword('RepeatTestPass2');

  for (let i = 0; i < ITERATIONS; i++) {
    const { db, cleanup } = createDisposableDb();
    try {
      const [res1, res2] = await Promise.all([
        initializeFirstAdmin(
          { name: `Admin IterA ${i}`, phone: `098100000${i}`, passwordHash: hash1 },
          db
        ),
        initializeFirstAdmin(
          { name: `Admin IterB ${i}`, phone: `098200000${i}`, passwordHash: hash2 },
          db
        ),
      ]);

      const successes = [res1, res2].filter((r) => r.success);
      const conflicts = [res1, res2].filter((r) => !r.success);

      assert.equal(successes.length, 1, `Iteration ${i}: exactly one must succeed`);
      assert.equal(conflicts.length, 1, `Iteration ${i}: exactly one must conflict`);

      const admins = await db.user.findMany({
        where: { passwordHash: { startsWith: '$2' } },
      });
      assert.equal(admins.length, 1, `Iteration ${i}: exactly one admin in DB`);
      assert.equal(admins[0].role, 'ADMIN');
    } finally {
      await cleanup();
    }
  }
});

test('route handler POST creates session only after successful initialization and returns 201', async () => {
  const { db, cleanup } = createDisposableDb();
  try {
    const sessionCalls: string[] = [];
    const fakeCreateSession = async (userId: string) => {
      sessionCalls.push(userId);
    };

    const req = new Request('http://localhost/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Route Admin',
        phone: '0912345688',
        password: 'ValidPassword123',
      }),
    });

    const res = await handleSetup(req, { db, createSession: fakeCreateSession });
    assert.equal(res.status, 201);
    const body = (await res.json()) as { success: boolean };
    assert.equal(body.success, true);
    assert.equal(sessionCalls.length, 1);

    const user = await db.user.findUnique({ where: { phone: '0912345688' } });
    assert.ok(user);
    assert.equal(user.role, 'ADMIN');
    assert.equal(sessionCalls[0], user.id);
  } finally {
    await cleanup();
  }
});

test('route handler POST returns HTTP 409 and does not create session on duplicate/conflict setup', async () => {
  const { db, cleanup } = createDisposableDb();
  try {
    const sessionCalls: string[] = [];
    const fakeCreateSession = async (userId: string) => {
      sessionCalls.push(userId);
    };

    const hash = await hashPassword('ExistingPass123');
    await db.user.create({
      data: {
        id: randomUUID(),
        name: 'Pre-existing Admin',
        phone: '0909999999',
        passwordHash: hash,
        role: 'ADMIN',
      },
    });

    const req = new Request('http://localhost/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Second Admin',
        phone: '0912345689',
        password: 'ValidPassword123',
      }),
    });

    const res = await handleSetup(req, { db, createSession: fakeCreateSession });
    assert.equal(res.status, 409);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'Hệ thống đã được khởi tạo');
    assert.equal(sessionCalls.length, 0, 'createSession must not be called on conflict');
  } finally {
    await cleanup();
  }
});

test('route handler POST concurrent requests result in exactly one 201 and one 409', async () => {
  const { db, cleanup } = createDisposableDb();
  try {
    const sessionCalls: string[] = [];
    const fakeCreateSession = async (userId: string) => {
      sessionCalls.push(userId);
    };

    const req1 = new Request('http://localhost/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Concurrent Route 1',
        phone: '0912345691',
        password: 'ValidPassword123',
      }),
    });

    const req2 = new Request('http://localhost/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Concurrent Route 2',
        phone: '0912345692',
        password: 'ValidPassword123',
      }),
    });

    const [res1, res2] = await Promise.all([
      handleSetup(req1, { db, createSession: fakeCreateSession }),
      handleSetup(req2, { db, createSession: fakeCreateSession }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [201, 409]);
    assert.equal(sessionCalls.length, 1, 'Session should be created exactly once');

    const admins = await db.user.findMany({
      where: { passwordHash: { startsWith: '$2' } },
    });
    assert.equal(admins.length, 1);
  } finally {
    await cleanup();
  }
});

test('SetupConflictError has correct type name and error code', () => {
  const err = new SetupConflictError();
  assert.equal(err.name, 'SetupConflictError');
  assert.equal(err.code, 'SETUP_CONFLICT');
  assert.equal(err.message, 'Hệ thống đã được khởi tạo');
  assert.equal(err instanceof Error, true);
  assert.equal(err instanceof SetupConflictError, true);
});

test('unrelated transaction error does not map to conflict when setup is incomplete', async () => {
  const { db, cleanup } = createDisposableDb();
  try {
    db.$transaction = (async () => {
      throw new Prisma.PrismaClientKnownRequestError('Transaction closed unexpectedly', {
        code: 'P2028',
        clientVersion: '6.4.1',
      });
    }) as unknown as typeof db.$transaction;

    const passwordHash = await hashPassword('ValidPass123');
    await assert.rejects(
      async () => {
        await initializeFirstAdmin(
          { name: 'Admin', phone: '0912345678', passwordHash },
          db
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof Prisma.PrismaClientKnownRequestError);
        assert.equal((err as Prisma.PrismaClientKnownRequestError).code, 'P2028');
        return true;
      }
    );
  } finally {
    await cleanup();
  }
});

test('demonstrated concurrency write conflict (P2034) maps to setup conflict', async () => {
  const { db, cleanup } = createDisposableDb();
  try {
    db.$transaction = (async () => {
      throw new Prisma.PrismaClientKnownRequestError('Write conflict or deadlock', {
        code: 'P2034',
        clientVersion: '6.4.1',
      });
    }) as unknown as typeof db.$transaction;

    const passwordHash = await hashPassword('ValidPass123');
    const result = await initializeFirstAdmin(
      { name: 'Admin', phone: '0912345678', passwordHash },
      db
    );

    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.conflict, true);
    assert.equal(result.code, 'SETUP_CONFLICT');
    assert.equal(result.error, 'Hệ thống đã được khởi tạo');
  } finally {
    await cleanup();
  }
});

test('route handler returns 500 without leaking DB internals on unexpected internal DB failure', async () => {
  const { db, cleanup } = createDisposableDb();
  try {
    const sessionCalls: string[] = [];
    const fakeCreateSession = async (userId: string) => {
      sessionCalls.push(userId);
    };

    db.$transaction = (async () => {
      throw new Error('PrismaClientInitializationError: Connection refused to sqlite');
    }) as unknown as typeof db.$transaction;

    const req = new Request('http://localhost/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Internal Error Admin',
        phone: '0912345688',
        password: 'ValidPassword123',
      }),
    });

    const res = await handleSetup(req, { db, createSession: fakeCreateSession });
    assert.equal(res.status, 500);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'Không thể khởi tạo hệ thống');
    assert.equal(sessionCalls.length, 0, 'createSession must not be called on internal error');
  } finally {
    await cleanup();
  }
});
