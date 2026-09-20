import { createServerFn } from '@tanstack/react-start'

import { requireSession } from '@/features/auth/auth.server'
import {
  addManualEntryRecord,
  deleteEntryRecord,
  getMyWeekMinutesRecord,
  getRunningEntryRecord,
  getWorkHourAnalysisRecord,
  getWorkHourReportRecord,
  listIssueEntriesRecord,
  listMyEntriesRecord,
  startTimerRecord,
  stopTimerRecord,
  updateEntryRecord,
} from './time-entries.server'
import {
  addManualEntryInputSchema,
  analysisInputSchema,
  deleteEntryInputSchema,
  issueEntriesInputSchema,
  myEntriesInputSchema,
  startTimerInputSchema,
  stopTimerInputSchema,
  updateEntryInputSchema,
} from './time-entries.schema'

export const getRunningEntry = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requireSession()
    return getRunningEntryRecord(session)
  },
)

export const startTimer = createServerFn({ method: 'POST' })
  .validator(startTimerInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    return startTimerRecord(session, data)
  })

export const stopTimer = createServerFn({ method: 'POST' })
  .validator(stopTimerInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    return stopTimerRecord(session, data)
  })

export const addManualEntry = createServerFn({ method: 'POST' })
  .validator(addManualEntryInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    return addManualEntryRecord(session, data)
  })

export const deleteEntry = createServerFn({ method: 'POST' })
  .validator(deleteEntryInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    return deleteEntryRecord(session, data.id)
  })

export const listIssueEntries = createServerFn({ method: 'GET' })
  .validator(issueEntriesInputSchema)
  .handler(({ data }) => listIssueEntriesRecord(data.issueId))

export const updateEntry = createServerFn({ method: 'POST' })
  .validator(updateEntryInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    return updateEntryRecord(session, data)
  })

export const listMyEntries = createServerFn({ method: 'GET' })
  .validator(myEntriesInputSchema)
  .handler(({ data }) => listMyEntriesRecord(data.limit))

export const getWorkHourAnalysis = createServerFn({ method: 'GET' })
  .validator(analysisInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    return getWorkHourAnalysisRecord(session, data)
  })

export const getWorkHourReport = createServerFn({ method: 'GET' })
  .validator(analysisInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    return getWorkHourReportRecord(session, data)
  })

export const getMyWeekMinutes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requireSession()
    return getMyWeekMinutesRecord(session)
  },
)
