import { z } from 'zod'

export const createUserInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'member']),
  departmentId: z.number().int().positive().nullable(),
})

export const updateUserInputSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80).optional(),
  role: z.enum(['admin', 'manager', 'member']).optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  password: z.string().min(8).optional(),
})

export const createDepartmentInputSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(60),
})

export type CreateUserInput = z.infer<typeof createUserInputSchema>
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>
export type CreateDepartmentInput = z.infer<typeof createDepartmentInputSchema>
