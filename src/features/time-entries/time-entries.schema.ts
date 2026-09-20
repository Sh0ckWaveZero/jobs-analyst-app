import { z } from 'zod'

import { MAX_LOG_MINUTES } from '@/lib/duration'

export const analysisRangeSchema = z.enum(['5D', '2W', '1M', '6M', '1Y'])
export type AnalysisRange = z.infer<typeof analysisRangeSchema>

export const workDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const workTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const startTimerInputSchema = z.object({
  projectId: z.number().int().positive(),
  issueId: z.number().int().positive().optional(),
  note: z.string().max(300).optional(),
})

export const stopTimerInputSchema = z.object({
  entryId: z.number().int().positive(),
})

export const addManualEntryInputSchema = z.object({
  projectId: z.number().int().positive(),
  issueId: z.number().int().positive().optional(),
  workDate: workDateSchema,
  startTime: workTimeSchema.optional(),
  minutes: z.number().int().min(1).max(MAX_LOG_MINUTES),
  note: z.string().max(300).optional(),
  /** เวลาคงเหลือใหม่ของ issue หลัง log นี้ — ไม่ส่งมา = ไม่แตะ remaining estimate */
  remainingEstimateMinutes: z.number().int().min(0).max(MAX_LOG_MINUTES).optional(),
})

export const deleteEntryInputSchema = z.object({
  id: z.number().int().positive(),
})

export const updateEntryInputSchema = z.object({
  id: z.number().int().positive(),
  minutes: z.number().int().min(1).max(MAX_LOG_MINUTES).optional(),
  workDate: workDateSchema.optional(),
  note: z.string().max(300).nullable().optional(),
})

export const issueEntriesInputSchema = z.object({
  issueId: z.number().int().positive(),
})

export const analysisInputSchema = z.object({
  range: analysisRangeSchema,
  projectId: z.number().int().positive().optional(),
})

export const myEntriesInputSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
})

export type StartTimerInput = z.infer<typeof startTimerInputSchema>
export type StopTimerInput = z.infer<typeof stopTimerInputSchema>
export type AddManualEntryInput = z.infer<typeof addManualEntryInputSchema>
export type UpdateEntryInput = z.infer<typeof updateEntryInputSchema>
export type AnalysisInput = z.infer<typeof analysisInputSchema>
