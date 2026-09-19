import { randomUUID } from 'node:crypto'
import { and, asc, eq, or, sql } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

import { getDb } from '@/db/client.server'
import { account, departments, user } from '@/db/schema'
import { requireSession } from '@/features/auth/auth.server'
import type { AuthSession } from '@/features/auth/auth.server'
import type {
  CreateDepartmentInput,
  CreateUserInput,
  UpdateUserInput,
} from './users.schema'

function requireAdmin(session: AuthSession) {
  if (session.user.role !== 'admin') {
    throw new Error('Forbidden — admin only')
  }
}

export async function listUsersRecord() {
  const session = await requireSession()
  requireAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: departments.name,
      createdAt: user.createdAt,
    })
    .from(user)
    .leftJoin(departments, eq(departments.id, user.departmentId))
    .orderBy(asc(user.name))
}

export type UserRow = Awaited<ReturnType<typeof listUsersRecord>>[number]

export async function createUserRecord(input: CreateUserInput) {
  const session = await requireSession()
  requireAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1)
  if (existing) throw new Error('Email already exists')

  const id = randomUUID()
  const passwordHash = await hashPassword(input.password)
  await db.insert(user).values({
    id,
    email: input.email,
    name: input.name,
    role: input.role,
    departmentId: input.departmentId,
    emailVerified: true,
  })
  await db.insert(account).values({
    id: randomUUID(),
    accountId: id,
    providerId: 'credential',
    userId: id,
    password: passwordHash,
  })
  return { id }
}

export async function updateUserRecord(input: UpdateUserInput) {
  const session = await requireSession()
  requireAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const { id, password, ...patch } = input
  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.name !== undefined) update.name = patch.name
  if (patch.role !== undefined) update.role = patch.role
  if (patch.departmentId !== undefined) update.departmentId = patch.departmentId

  const [row] = await db
    .update(user)
    .set(update)
    .where(eq(user.id, id))
    .returning()
  if (!row) throw new Error('User not found')

  if (password) {
    const passwordHash = await hashPassword(password)
    await db
      .update(account)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(and(eq(account.userId, id), eq(account.providerId, 'credential')))
  }
  return { ok: true as const }
}

export async function listDepartmentsRecord() {
  await requireSession()
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  return db
    .select({
      id: departments.id,
      name: departments.name,
      memberCount: sql<number>`count(${user.id})::int`,
    })
    .from(departments)
    .leftJoin(user, eq(user.departmentId, departments.id))
    .groupBy(departments.id, departments.name)
    .orderBy(asc(departments.name))
}

export type DepartmentRow = Awaited<
  ReturnType<typeof listDepartmentsRecord>
>[number]

export async function createDepartmentRecord(input: CreateDepartmentInput) {
  const session = await requireSession()
  requireAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [row] = await db
    .insert(departments)
    .values({ name: input.name })
    .returning()
  return row!
}

/**
 * รายชื่อคนที่ assign ได้ตามบทบาท:
 * admin/manager → ทุกคน · member → ตัวเอง + คนในแผนกเดียวกัน
 */
export async function getAssignableUsersRecord(session: AuthSession) {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const role = session.user.role
  if (role === 'admin' || role === 'manager') {
    return db
      .select({
        id: user.id,
        name: user.name,
        departmentId: user.departmentId,
      })
      .from(user)
      .orderBy(asc(user.name))
  }

  const [me] = await db
    .select({ departmentId: user.departmentId })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  const scope = me?.departmentId
    ? or(eq(user.id, session.user.id), eq(user.departmentId, me.departmentId))
    : eq(user.id, session.user.id)

  return db
    .select({
      id: user.id,
      name: user.name,
      departmentId: user.departmentId,
    })
    .from(user)
    .where(scope)
    .orderBy(asc(user.name))
}
