import { randomUUID } from 'node:crypto'
import { and, asc, eq, max, or, sql } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

import { getDb } from '@/db/client.server'
import {
  accessRoles,
  account,
  departments,
  session as authSession,
  user,
} from '@/db/schema'
import { requirePermission, requireSession } from '@/features/auth/auth.server'
import type { AuthSession } from '@/features/auth/auth.server'
import { Permissions } from '@/lib/rbac'
import type { PermissionKey } from '@/lib/rbac'
import { Role } from '@/lib/roles'
import type {
  CreateDepartmentInput,
  CreateUserInput,
  DeleteDepartmentInput,
  UpdateDepartmentInput,
  UpdateUserInput,
} from './users.schema'

async function requireAdmin(
  session: AuthSession,
  permission: PermissionKey = Permissions.UsersManage,
) {
  if (session.user.role !== Role.Admin) {
    throw new Error('Forbidden — admin only')
  }
  await requirePermission(session, permission)
}

export async function listUsersRecord() {
  const session = await requireSession()
  await requireAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const lastLogin = db
    .select({
      userId: authSession.userId,
      lastLoginAt: max(authSession.updatedAt).as('last_login_at'),
    })
    .from(authSession)
    .groupBy(authSession.userId)
    .as('last_login')

  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      departmentId: user.departmentId,
      departmentName: departments.name,
      createdAt: user.createdAt,
      lastLoginAt: lastLogin.lastLoginAt,
    })
    .from(user)
    .leftJoin(departments, eq(departments.id, user.departmentId))
    .leftJoin(lastLogin, eq(lastLogin.userId, user.id))
    .orderBy(asc(user.name))
}

export type UserRow = Awaited<ReturnType<typeof listUsersRecord>>[number]

export async function createUserRecord(input: CreateUserInput) {
  const session = await requireSession()
  await requireAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1)
  if (existing) throw new Error('Email already exists')

  await assertRoleExists(db, input.role)

  const id = randomUUID()
  const passwordHash = await hashPassword(input.password)
  await db.insert(user).values({
    id,
    email: input.email,
    name: input.name,
    username: input.username ?? null,
    phoneNumber: input.phoneNumber ?? null,
    role: input.role,
    departmentId: input.departmentId,
    status: input.status ?? 'active',
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
  await requireAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const { id, password, ...patch } = input
  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.name !== undefined) update.name = patch.name
  if (patch.email !== undefined) {
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.email, patch.email), sql`${user.id} <> ${id}`))
      .limit(1)
    if (existing) throw new Error('Email already exists')
    update.email = patch.email
  }
  if (patch.username !== undefined) update.username = patch.username
  if (patch.phoneNumber !== undefined) update.phoneNumber = patch.phoneNumber
  if (patch.role !== undefined) {
    await assertRoleExists(db, patch.role)
    update.role = patch.role
  }
  if (patch.departmentId !== undefined) update.departmentId = patch.departmentId
  if (patch.status !== undefined) {
    if (patch.status !== 'active' && id === session.user.id) {
      throw new Error('You cannot deactivate your own account')
    }
    update.status = patch.status
  }

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
  if (patch.status === 'inactive' || patch.status === 'suspended') {
    await db.delete(authSession).where(eq(authSession.userId, id))
  }
  return { ok: true as const }
}

async function assertRoleExists(
  db: NonNullable<ReturnType<typeof getDb>>,
  key: string,
) {
  const [role] = await db
    .select({ key: accessRoles.key })
    .from(accessRoles)
    .where(eq(accessRoles.key, key))
    .limit(1)
  if (!role) throw new Error('Role not found')
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
  await requireAdmin(session, Permissions.DepartmentsManage)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [row] = await db
    .insert(departments)
    .values({ name: input.name })
    .returning()
  return row!
}

export async function updateDepartmentRecord(input: UpdateDepartmentInput) {
  const session = await requireSession()
  await requireAdmin(session, Permissions.DepartmentsManage)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [row] = await db
    .update(departments)
    .set({ name: input.name, updatedAt: new Date() })
    .where(eq(departments.id, input.id))
    .returning({ id: departments.id, name: departments.name })

  if (!row) throw new Error('Department not found')
  return row
}

export async function deleteDepartmentRecord(input: DeleteDepartmentInput) {
  const session = await requireSession()
  await requireAdmin(session, Permissions.DepartmentsManage)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [row] = await db
    .delete(departments)
    .where(eq(departments.id, input.id))
    .returning({ id: departments.id })

  if (!row) throw new Error('Department not found')
  return { ok: true as const }
}

/**
 * รายชื่อคนที่ assign ได้ตามบทบาท:
 * admin/manager → ทุกคน · member → ตัวเอง + คนในแผนกเดียวกัน
 */
export async function getAssignableUsersRecord(session: AuthSession) {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const role = session.user.role
  if (role === Role.Admin || role === Role.Manager) {
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
