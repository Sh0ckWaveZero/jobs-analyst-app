import { createServerFn } from '@tanstack/react-start'

import {
  createRoleRecord,
  createPermissionRecord,
  deleteRoleRecord,
  listRolesRecord,
  listRbacMatrixRecord,
  updateRoleRecord,
  updateRolePermissionsRecord,
} from './rbac.server'
import {
  createRoleInputSchema,
  createPermissionInputSchema,
  deleteRoleInputSchema,
  updateRoleInputSchema,
  updateRolePermissionsInputSchema,
} from './rbac.schema'

export const listRoles = createServerFn({ method: 'GET' }).handler(() =>
  listRolesRecord(),
)

export const listRbacMatrix = createServerFn({ method: 'GET' }).handler(() =>
  listRbacMatrixRecord(),
)

export const updateRolePermissions = createServerFn({ method: 'POST' })
  .validator(updateRolePermissionsInputSchema)
  .handler(({ data }) => updateRolePermissionsRecord(data))

export const createRole = createServerFn({ method: 'POST' })
  .validator(createRoleInputSchema)
  .handler(({ data }) => createRoleRecord(data))

export const createPermission = createServerFn({ method: 'POST' })
  .validator(createPermissionInputSchema)
  .handler(({ data }) => createPermissionRecord(data))

export const updateRole = createServerFn({ method: 'POST' })
  .validator(updateRoleInputSchema)
  .handler(({ data }) => updateRoleRecord(data))

export const deleteRole = createServerFn({ method: 'POST' })
  .validator(deleteRoleInputSchema)
  .handler(({ data }) => deleteRoleRecord(data))
