import { z } from 'zod'

// จำกัด 24 ชั่วโมงต่อรายการ — ตรงกับ MAX_LOG_MINUTES ใน src/lib/duration.ts
const MAX_MINUTES = 1440

export const analysisRangeSchema = z.enum(['5D', '2W', '1M', '6M', '1Y'])
export type AnalysisRange = z.infer<typeof analysisRangeSchema>

export const workDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

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
  minutes: z.number().int().min(1).max(MAX_MINUTES),
  note: z.string().max(300).optional(),
})

export const deleteEntryInputSchema = z.object({
  id: z.number().int().positive(),
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
export type AnalysisInput = z.infer<typeof analysisInputSchema>
