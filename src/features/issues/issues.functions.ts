import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'

import {
  createIssueRecord,
  deleteIssueRecord,
  getDashboardCountsRecord,
  listIssuesRecord,
  updateIssueRecord,
} from './issues.server'
import { requireSession } from '@/features/auth/auth.server'
import {
  createIssueInputSchema,
  listIssuesInputSchema,
  updateIssueInputSchema,
} from './issues.schema'

export const listIssues = createServerFn({ method: 'GET' })
  .validator(listIssuesInputSchema)
  .handler(({ data }) => listIssuesRecord(data))

export const createIssue = createServerFn({ method: 'POST' })
  .validator(createIssueInputSchema)
  .handler(({ data }) => createIssueRecord(data))

export const updateIssue = createServerFn({ method: 'POST' })
  .validator(updateIssueInputSchema)
  .handler(({ data }) => updateIssueRecord(data))

export const deleteIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(({ data }) => deleteIssueRecord(data.id))

export const getDashboardCounts = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requireSession()
    return getDashboardCountsRecord(session)
  },
)
