import { z } from 'zod'

const permissionKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Permission key is required')
  .max(80)
  .regex(
    /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/,
    'Use lowercase segments separated by ., _ or -',
  )

export const rolePermissionUpdateSchema = z.object({
  role: z.string().trim().min(1).max(64),
  permission: permissionKeySchema,
  enabled: z.boolean(),
})

export const updateRolePermissionsInputSchema = z.object({
  updates: z.array(rolePermissionUpdateSchema).min(1).max(100),
})

export type RolePermissionUpdate = z.infer<typeof rolePermissionUpdateSchema>
export type UpdateRolePermissionsInput = z.infer<
  typeof updateRolePermissionsInputSchema
>

export const createRoleInputSchema = z.object({
  label: z.string().trim().min(2, 'Role name is required').max(60),
  description: z.string().trim().max(180),
})

export const updateRoleInputSchema = createRoleInputSchema.extend({
  key: z.string().trim().min(1).max(64),
})

export const deleteRoleInputSchema = z.object({
  key: z.string().trim().min(1).max(64),
})

export const createPermissionInputSchema = z.object({
  key: permissionKeySchema,
  group: z.string().trim().min(2, 'Permission group is required').max(40),
  label: z.string().trim().min(2, 'Permission name is required').max(80),
  description: z.string().trim().max(180),
})

export type CreateRoleInput = z.infer<typeof createRoleInputSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleInputSchema>
export type DeleteRoleInput = z.infer<typeof deleteRoleInputSchema>
export type CreatePermissionInput = z.infer<typeof createPermissionInputSchema>
