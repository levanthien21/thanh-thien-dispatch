import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'tt_session';
const SESSION_SECONDS = 60 * 60 * 12;

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

type SessionRow = AuthUser & { expiresAt: Date | string };

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (!passwordHash.startsWith('$2')) return false;
  return bcrypt.compare(password, passwordHash);
}

export function validatePassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    throw new Error('Mật khẩu phải có từ 10 đến 128 ký tự');
  }
  if (!/[A-Za-zÀ-ỹ]/.test(password) || !/\d/.test(password)) {
    throw new Error('Mật khẩu phải có ít nhất một chữ và một số');
  }
  return password;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await prisma.$executeRaw`
    INSERT INTO "Session" (id, "tokenHash", "userId", "expiresAt", "createdAt")
    VALUES (${randomUUID()}, ${tokenHash(token)}, ${userId}, ${expiresAt}, NOW())
  `;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
    priority: 'high',
  });
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.$executeRaw`DELETE FROM "Session" WHERE "tokenHash" = ${tokenHash(token)}`;
  store.delete(SESSION_COOKIE);
}

export async function verifySessionToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token || token.length < 32) return null;
  const rows = await prisma.$queryRaw<SessionRow[]>`
    SELECT u.id, u.name, u.phone, u.role, s."expiresAt"
    FROM "Session" s
    JOIN "User" u ON u.id = s."userId"
    WHERE s."tokenHash" = ${tokenHash(token)} AND s."expiresAt" > ${new Date()} AND u.status = 'ACTIVE'
    LIMIT 1
  `;
  const row = rows[0];
  return row ? { id: row.id, name: row.name, phone: row.phone, role: row.role } : null;
}

export async function getCurrentUser() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireUser(roles?: string[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  if (roles && !roles.includes(user.role)) throw new Error('FORBIDDEN');
  return user;
}

export async function needsInitialSetup(db: PrismaClient = prisma) {
  const rows = await db.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*) AS count FROM "User" WHERE "passwordHash" LIKE '$2%'
  `;
  return Number(rows[0]?.count ?? 0) === 0;
}

export class SetupConflictError extends Error {
  readonly code = 'SETUP_CONFLICT' as const;
  constructor(message = 'Hệ thống đã được khởi tạo') {
    super(message);
    this.name = 'SetupConflictError';
  }
}

export type InitializeAdminInput = {
  name: string;
  phone: string;
  passwordHash: string;
};

export type InitializeAdminSuccess = {
  success: true;
  userId: string;
};

export type InitializeAdminConflict = {
  success: false;
  conflict: true;
  code: 'SETUP_CONFLICT';
  error: string;
};

export type InitializeAdminResult = InitializeAdminSuccess | InitializeAdminConflict;

export async function initializeFirstAdmin(
  input: InitializeAdminInput,
  db: PrismaClient = prisma
): Promise<InitializeAdminResult> {
  try {
    const result = await db.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<Array<{ count: bigint | number }>>`
          SELECT COUNT(*) AS count FROM "User" WHERE "passwordHash" LIKE '$2%'
        `;
        const count = Number(rows[0]?.count ?? 0);
        if (count > 0) {
          throw new SetupConflictError('Hệ thống đã được khởi tạo');
        }

        const existing = await tx.user.findFirst({
          orderBy: { createdAt: 'asc' },
        });

        const userId = existing?.id ?? randomUUID();
        if (existing) {
          await tx.user.update({
            where: { id: existing.id },
            data: {
              name: input.name,
              phone: input.phone,
              passwordHash: input.passwordHash,
              role: 'ADMIN',
              status: 'ACTIVE',
            },
          });
        } else {
          await tx.user.create({
            data: {
              id: userId,
              name: input.name,
              phone: input.phone,
              passwordHash: input.passwordHash,
              role: 'ADMIN',
              status: 'ACTIVE',
            },
          });
        }

        return { success: true as const, userId };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return result;
  } catch (error: unknown) {
    if (error instanceof SetupConflictError) {
      return {
        success: false,
        conflict: true,
        code: 'SETUP_CONFLICT',
        error: error.message,
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2034' || error.code === 'P2002') {
        return {
          success: false,
          conflict: true,
          code: 'SETUP_CONFLICT',
          error: 'Hệ thống đã được khởi tạo',
        };
      }
    }

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('write conflict') ||
        msg.includes('deadlock')
      ) {
        return {
          success: false,
          conflict: true,
          code: 'SETUP_CONFLICT',
          error: 'Hệ thống đã được khởi tạo',
        };
      }
    }

    try {
      if (!(await needsInitialSetup(db))) {
        return {
          success: false,
          conflict: true,
          code: 'SETUP_CONFLICT',
          error: 'Hệ thống đã được khởi tạo',
        };
      }
    } catch {
      // Ignore fallback check errors
    }

    throw error;
  }
}

