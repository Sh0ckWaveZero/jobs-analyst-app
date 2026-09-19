import { z } from 'zod'

export const createProjectInputSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z]+$/, 'key must be uppercase letters'),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
})

export const updateProjectInputSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived']).optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>
