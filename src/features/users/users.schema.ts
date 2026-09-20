import { z } from 'zod'

const roleKeySchema = z.string().trim().min(1, 'Role is required').max(64)

export const userStatusSchema = z.enum([
  'active',
  'inactive',
  'invited',
  'suspended',
])

export const createUserInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  username: z.string().trim().max(80).nullable().optional(),
  phoneNumber: z.string().trim().max(40).nullable().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: roleKeySchema,
  departmentId: z.number().int().positive().nullable(),
  status: userStatusSchema.optional(),
})

export const updateUserInputSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email('Invalid email').optional(),
  username: z.string().trim().max(80).nullable().optional(),
  phoneNumber: z.string().trim().max(40).nullable().optional(),
  role: roleKeySchema.optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  password: z.string().min(8).optional(),
  status: userStatusSchema.optional(),
})

export const createDepartmentInputSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(60),
})

export const updateDepartmentInputSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1, 'Department name is required').max(60),
})

export const deleteDepartmentInputSchema = z.object({
  id: z.number().int().positive(),
})

export type CreateUserInput = z.infer<typeof createUserInputSchema>
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>
export type CreateDepartmentInput = z.infer<typeof createDepartmentInputSchema>
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentInputSchema>
export type DeleteDepartmentInput = z.infer<typeof deleteDepartmentInputSchema>
