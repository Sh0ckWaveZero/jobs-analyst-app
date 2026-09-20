import { randomUUID } from 'node:crypto'
import { asc, eq, inArray, sql } from 'drizzle-orm'

import { getDb } from '@/db/client.server'
import {
  accessRoles,
  permissions as permissionsTable,
  rolePermissions,
  user,
} from '@/db/schema'
import {
  requirePermission,
  requireRole,
  requireSession,
} from '@/features/auth/auth.server'
import type { AuthSession } from '@/features/auth/auth.server'
import {
  defaultHasPermission,
  PERMISSION_CATALOG,
  Permissions,
} from '@/lib/rbac'
import { Role } from '@/lib/roles'
import type {
  CreatePermissionInput,
  CreateRoleInput,
  DeleteRoleInput,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
} from './rbac.schema'

async function requireRbacAdmin(session: AuthSession) {
  requireRole(session, [Role.Admin])
  await requirePermission(session, Permissions.RolesManage)
}

function roleKeyFromLabel(label: string) {
  const slug = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()

  return `custom_${slug || 'role'}_${randomUUID().slice(0, 8)}`
}

async function listRoleRows() {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  return db
    .select({
      key: accessRoles.key,
      label: accessRoles.label,
      description: accessRoles.description,
      isSystem: accessRoles.isSystem,
      memberCount: sql<number>`count(${user.id})::int`,
    })
    .from(accessRoles)
    .leftJoin(user, eq(user.role, accessRoles.key))
    .groupBy(
      accessRoles.key,
      accessRoles.label,
      accessRoles.description,
      accessRoles.isSystem,
    )
    .orderBy(asc(accessRoles.label))
}

export async function listRolesRecord() {
  const session = await requireSession()
  requireRole(session, [Role.Admin])
  return listRoleRows()
}

export async function listRbacMatrixRecord() {
  const session = await requireSession()
  await requireRbacAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [roles, permissionRows, stored] = await Promise.all([
    listRoleRows(),
    db
      .select({
        key: permissionsTable.key,
        group: permissionsTable.permissionGroup,
        label: permissionsTable.label,
        description: permissionsTable.description,
        isSystem: permissionsTable.isSystem,
        protectedForAdmin: permissionsTable.protectedForAdmin,
      })
      .from(permissionsTable)
      .orderBy(
        asc(permissionsTable.permissionGroup),
        asc(permissionsTable.label),
      ),
    db
      .select({
        role: rolePermissions.role,
        permission: rolePermissions.permission,
        enabled: rolePermissions.enabled,
      })
      .from(rolePermissions),
  ])

  const storedMap = new Map(
    stored.map((row) => [`${row.role}:${row.permission}`, row.enabled]),
  )

  return {
    roles,
    permissions: permissionRows.map((permission) => {
      const systemPermission = PERMISSION_CATALOG.find(
        (candidate) => candidate.key === permission.key,
      )
      return {
        ...permission,
        enabled: Object.fromEntries(
          roles.map((role) => [
            role.key,
            storedMap.get(`${role.key}:${permission.key}`) ??
              (systemPermission
                ? defaultHasPermission(role.key, systemPermission.key)
                : false),
          ]),
        ),
      }
    }),
  }
}

export async function createRoleRecord(input: CreateRoleInput) {
  const session = await requireSession()
  await requireRbacAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [row] = await db
    .insert(accessRoles)
    .values({
      key: roleKeyFromLabel(input.label),
      label: input.label,
      description: input.description,
      isSystem: false,
    })
    .returning()

  return row!
}

export async function createPermissionRecord(input: CreatePermissionInput) {
  const session = await requireSession()
  await requireRbacAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const key = input.key.trim().toLowerCase()
  if (PERMISSION_CATALOG.some((permission) => permission.key === key)) {
    throw new Error('System permission keys cannot be replaced')
  }

  const [existing] = await db
    .select({ key: permissionsTable.key })
    .from(permissionsTable)
    .where(eq(permissionsTable.key, key))
    .limit(1)
  if (existing) throw new Error('Permission key already exists')

  const [row] = await db
    .insert(permissionsTable)
    .values({
      key,
      permissionGroup: input.group,
      label: input.label,
      description: input.description,
      isSystem: false,
      protectedForAdmin: false,
    })
    .returning()

  return row!
}

export async function updateRoleRecord(input: UpdateRoleInput) {
  const session = await requireSession()
  await requireRbacAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [existing] = await db
    .select({ isSystem: accessRoles.isSystem })
    .from(accessRoles)
    .where(eq(accessRoles.key, input.key))
    .limit(1)
  if (!existing) throw new Error('Role not found')
  if (existing.isSystem) throw new Error('Built-in roles cannot be edited')

  const [row] = await db
    .update(accessRoles)
    .set({
      label: input.label,
      description: input.description,
      updatedAt: new Date(),
    })
    .where(eq(accessRoles.key, input.key))
    .returning()

  return row!
}

export async function deleteRoleRecord(input: DeleteRoleInput) {
  const session = await requireSession()
  await requireRbacAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [existing] = await db
    .select({ isSystem: accessRoles.isSystem })
    .from(accessRoles)
    .where(eq(accessRoles.key, input.key))
    .limit(1)
  if (!existing) throw new Error('Role not found')
  if (existing.isSystem) throw new Error('Built-in roles cannot be deleted')

  const [assigned] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, input.key))
    .limit(1)
  if (assigned)
    throw new Error('Role is assigned to users and cannot be deleted')

  await db.delete(accessRoles).where(eq(accessRoles.key, input.key))
  return { ok: true as const }
}

export async function updateRolePermissionsRecord(
  input: UpdateRolePermissionsInput,
) {
  const session = await requireSession()
  await requireRbacAdmin(session)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const updates = Array.from(
    new Map(
      input.updates.map((update) => [
        `${update.role}:${update.permission}`,
        update,
      ]),
    ).values(),
  )

  const permissionRows = await db
    .select({
      key: permissionsTable.key,
      label: permissionsTable.label,
      protectedForAdmin: permissionsTable.protectedForAdmin,
    })
    .from(permissionsTable)
    .where(
      inArray(
        permissionsTable.key,
        updates.map((update) => update.permission),
      ),
    )
  const permissionByKey = new Map(
    permissionRows.map((permission) => [permission.key, permission]),
  )

  for (const update of updates) {
    const permission = permissionByKey.get(update.permission)
    if (!permission) {
      throw new Error(`Unknown permission: ${update.permission}`)
    }
    if (
      update.role === Role.Admin &&
      permission.protectedForAdmin &&
      !update.enabled
    ) {
      throw new Error(
        `${permission.label} must stay enabled for the Admin role`,
      )
    }
  }

  await db.transaction(async (tx) => {
    await Promise.all(
      updates.map((update) => {
        const now = new Date()
        return tx
          .insert(rolePermissions)
          .values({
            role: update.role,
            permission: update.permission,
            enabled: update.enabled,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [rolePermissions.role, rolePermissions.permission],
            set: { enabled: update.enabled, updatedAt: now },
          })
      }),
    )
  })

  return { ok: true as const, updated: updates.length }
}
