import { z } from 'zod'

export const issueStatusSchema = z.enum([
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
])
export const issuePrioritySchema = z.enum(['low', 'medium', 'high'])

export const listIssuesInputSchema = z.object({
  projectId: z.number().int().positive().optional(),
  assigneeId: z.string().optional(),
  reporterId: z.string().optional(),
  status: issueStatusSchema.optional(),
  limit: z.number().int().positive().max(200).optional(),
})

export const createIssueInputSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: issueStatusSchema.default('todo'),
  priority: issuePrioritySchema.default('medium'),
  assigneeId: z.string().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  labels: z.array(z.string().min(1).max(30)).max(6).optional(),
})

export const updateIssueInputSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: issueStatusSchema.optional(),
  priority: issuePrioritySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  labels: z.array(z.string().min(1).max(30)).max(6).optional(),
})

export type ListIssuesInput = z.infer<typeof listIssuesInputSchema>
export type CreateIssueInput = z.infer<typeof createIssueInputSchema>
export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>
