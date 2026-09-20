import { and, desc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm'

import { getDb } from '@/db/client.server'
import { issues, projects, timeEntries, user } from '@/db/schema'
import {
  hasPermission,
  requirePermission,
  requireSession,
} from '@/features/auth/auth.server'
import type { AuthSession } from '@/features/auth/auth.server'
import { Permissions } from '@/lib/rbac'
import { assertProjectActive } from '@/features/projects/projects.server'
import type {
  AddManualEntryInput,
  AnalysisInput,
  AnalysisRange,
  StartTimerInput,
  StopTimerInput,
  UpdateEntryInput,
} from './time-entries.schema'

const RANGE_DAYS: Record<AnalysisRange, number> = {
  '5D': 5,
  '2W': 14,
  '1M': 30,
  '6M': 180,
  '1Y': 365,
}

export function toWorkDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** ขอบเขตข้อมูลตามบทบาท: admin ทุกอย่าง, manager ทีมในโปรเจกต์ที่ตัวเองเป็นเจ้าของ + ของตัวเอง, member เฉพาะตัวเอง */
async function analysisScope(session: AuthSession) {
  if (await hasPermission(session, Permissions.ReportsViewAll)) {
    return undefined // ไม่จำกัด
  }
  const db = getDb()!
  if (await hasPermission(session, Permissions.ReportsViewTeam)) {
    const owned = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, session.user.id))
    const ownedIds = owned.map((r) => r.id)
    const conditions = [
      eq(timeEntries.userId, session.user.id),
      ...(ownedIds.length ? [inArray(timeEntries.projectId, ownedIds)] : []),
    ]
    return or(...conditions)
  }
  await requirePermission(session, Permissions.ReportsViewOwn)
  return eq(timeEntries.userId, session.user.id)
}

export async function getRunningEntryRecord(session: AuthSession) {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [row] = await db
    .select({
      id: timeEntries.id,
      projectId: timeEntries.projectId,
      projectKey: projects.key,
      issueId: timeEntries.issueId,
      issueNumber: issues.number,
      issueTitle: issues.title,
      note: timeEntries.note,
      startedAt: timeEntries.startedAt,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(issues, eq(issues.id, timeEntries.issueId))
    .where(
      and(eq(timeEntries.userId, session.user.id), isNull(timeEntries.endedAt)),
    )
    .orderBy(desc(timeEntries.startedAt))
    .limit(1)
  return row ?? null
}

export async function startTimerRecord(
  session: AuthSession,
  input: StartTimerInput,
) {
  await requirePermission(session, Permissions.TimeEntriesCreate)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')
  await assertProjectActive(input.projectId)

  const running = await getRunningEntryRecord(session)
  if (running) {
    throw new Error('A timer is already running — stop it first')
  }

  const startedAt = new Date()
  const [row] = await db
    .insert(timeEntries)
    .values({
      projectId: input.projectId,
      issueId: input.issueId,
      userId: session.user.id,
      startedAt,
      endedAt: null,
      durationMinutes: 0,
      note: input.note,
      workDate: toWorkDate(startedAt),
    })
    .returning()
  return row
}

export async function stopTimerRecord(
  session: AuthSession,
  input: StopTimerInput,
) {
  await requirePermission(session, Permissions.TimeEntriesCreate)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, input.entryId))
    .limit(1)
  if (!entry) throw new Error('Entry not found')
  if (entry.userId !== session.user.id) throw new Error('Forbidden')
  if (entry.endedAt) throw new Error('Timer already stopped')

  const endedAt = new Date()
  const durationMinutes = Math.max(
    1,
    Math.round((endedAt.getTime() - entry.startedAt.getTime()) / 60_000),
  )
  const [row] = await db
    .update(timeEntries)
    .set({
      endedAt,
      durationMinutes,
      workDate: toWorkDate(entry.startedAt),
      updatedAt: endedAt,
    })
    .where(eq(timeEntries.id, entry.id))
    .returning()
  return row
}

export async function addManualEntryRecord(
  session: AuthSession,
  input: AddManualEntryInput,
) {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')
  await assertProjectActive(input.projectId)

  // startedAt = workDate + startTime (ถ้าไม่ระบุเวลา ใช้ 09:00 เป็นตัวแทน)
  const [y, m, d] = input.workDate.split('-').map(Number)
  if (!y || !m || !d) throw new Error('invalid workDate')
  const [hh, mm] = (input.startTime ?? '09:00').split(':').map(Number)
  const startedAt = new Date(y, m - 1, d, hh, mm, 0)
  const endedAt = new Date(startedAt.getTime() + input.minutes * 60_000)

  const [row] = await db
    .insert(timeEntries)
    .values({
      projectId: input.projectId,
      issueId: input.issueId,
      userId: session.user.id,
      startedAt,
      endedAt,
      durationMinutes: input.minutes,
      note: input.note,
      workDate: input.workDate,
    })
    .returning()

  if (input.issueId && input.remainingEstimateMinutes !== undefined) {
    await db
      .update(issues)
      .set({ remainingEstimateMinutes: input.remainingEstimateMinutes })
      .where(eq(issues.id, input.issueId))
  }

  return row
}

export async function deleteEntryRecord(session: AuthSession, id: number) {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [entry] = await db
    .select({ userId: timeEntries.userId })
    .from(timeEntries)
    .where(eq(timeEntries.id, id))
    .limit(1)
  if (!entry) throw new Error('Entry not found')
  if (
    entry.userId !== session.user.id &&
    !(await hasPermission(session, Permissions.TimeEntriesManageAll))
  ) {
    throw new Error('Forbidden')
  }
  await db.delete(timeEntries).where(eq(timeEntries.id, id))
  return { ok: true as const }
}

/** ประวัติเวลาราย issue (แบบ worklog ของ Jira) — อ่านได้ทุก role ที่ล็อกอิน */
export async function listIssueEntriesRecord(
  issueId: number,
  limit?: number,
  offset = 0,
  userId?: string,
) {
  await requireSession()
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  return db
    .select({
      id: timeEntries.id,
      userId: timeEntries.userId,
      userName: user.name,
      durationMinutes: timeEntries.durationMinutes,
      workDate: timeEntries.workDate,
      note: timeEntries.note,
      startedAt: timeEntries.startedAt,
      running: sql<boolean>`(${timeEntries.endedAt} is null)`,
    })
    .from(timeEntries)
    .leftJoin(user, eq(user.id, timeEntries.userId))
    .where(
      and(
        eq(timeEntries.issueId, issueId),
        userId ? eq(timeEntries.userId, userId) : undefined,
      ),
    )
    .orderBy(desc(timeEntries.startedAt))
    .limit(limit ?? 1_000)
    .offset(offset)
}

export type IssueEntryRow = Awaited<
  ReturnType<typeof listIssueEntriesRecord>
>[number]

/** จำนวน worklog ทั้งหมดของ issue (ใช้คำนวณจำนวนหน้า) */
export async function countIssueEntriesRecord(
  issueId: number,
  userId?: string,
) {
  await requireSession()
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.issueId, issueId),
        userId ? eq(timeEntries.userId, userId) : undefined,
      ),
    )
  return Number(row?.count ?? 0)
}

/** identity ของ issue สำหรับหัวหน้า worklog page (key/ชื่อ/โปรเจกต์) */
export async function getIssueMetaRecord(issueId: number) {
  await requireSession()
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [row] = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      projectKey: projects.key,
      number: issues.number,
      title: issues.title,
    })
    .from(issues)
    .innerJoin(projects, eq(projects.id, issues.projectId))
    .where(eq(issues.id, issueId))
    .limit(1)
  if (!row) throw new Error('Issue not found')
  return row
}

/** แก้ไขรายการเวลา — เจ้าของรายการหรือ admin เท่านั้น */
export async function updateEntryRecord(
  session: AuthSession,
  input: UpdateEntryInput,
) {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, input.id))
    .limit(1)
  if (!entry) throw new Error('Entry not found')
  if (
    entry.userId !== session.user.id &&
    !(await hasPermission(session, Permissions.TimeEntriesManageAll))
  ) {
    throw new Error('Forbidden')
  }

  let startedAt = entry.startedAt
  if (input.workDate && input.workDate !== entry.workDate) {
    const [y, m, d] = input.workDate.split('-').map(Number)
    if (!y || !m || !d) throw new Error('invalid workDate')
    startedAt = new Date(
      y,
      m - 1,
      d,
      entry.startedAt.getHours(),
      entry.startedAt.getMinutes(),
    )
  }
  const minutes = input.minutes ?? entry.durationMinutes
  const endedAt = entry.endedAt
    ? new Date(startedAt.getTime() + minutes * 60_000)
    : null

  const [row] = await db
    .update(timeEntries)
    .set({
      durationMinutes: minutes,
      workDate: input.workDate ?? entry.workDate,
      note: input.note === undefined ? entry.note : input.note,
      startedAt,
      endedAt,
    })
    .where(eq(timeEntries.id, input.id))
    .returning()
  return row
}

export async function listMyEntriesRecord(limit = 20, offset = 0) {
  const session = await requireSession()
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  return db
    .select({
      id: timeEntries.id,
      projectKey: projects.key,
      issueNumber: issues.number,
      issueTitle: issues.title,
      durationMinutes: timeEntries.durationMinutes,
      workDate: timeEntries.workDate,
      running: sql<boolean>`(${timeEntries.endedAt} is null)`,
      startedAt: timeEntries.startedAt,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(issues, eq(issues.id, timeEntries.issueId))
    .where(eq(timeEntries.userId, session.user.id))
    .orderBy(desc(timeEntries.startedAt))
    .limit(limit)
    .offset(offset)
}

export type MyEntryRow = Awaited<ReturnType<typeof listMyEntriesRecord>>[number]

/** จำนวน entry ทั้งหมดของผู้ใช้ (ใช้คำนวณจำนวนหน้าในหน้า My Time Entries) */
export async function countMyEntriesRecord() {
  const session = await requireSession()
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(timeEntries)
    .where(eq(timeEntries.userId, session.user.id))
  return Number(row?.count ?? 0)
}

/** รายงานเวลาต่อคน×ต่อโปรเจกต์ (หน้า Reports) — scope ตามบทบาทเดียวกับ analysis */
export async function getWorkHourReportRecord(
  session: AuthSession,
  input: AnalysisInput,
) {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const days = RANGE_DAYS[input.range]
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - (days - 1))
  fromDate.setHours(0, 0, 0, 0)

  const scope = await analysisScope(session)
  const filters = [gte(timeEntries.workDate, toWorkDate(fromDate))]

  const rows = await db
    .select({
      userId: timeEntries.userId,
      userName: user.name,
      projectKey: projects.key,
      projectName: projects.name,
      minutes: sql<number>`sum(${timeEntries.durationMinutes})::int`,
    })
    .from(timeEntries)
    .innerJoin(user, eq(user.id, timeEntries.userId))
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .where(scope ? and(scope, ...filters) : and(...filters))
    .groupBy(timeEntries.userId, user.name, projects.key, projects.name)
    .orderBy(user.name, desc(sql`sum(${timeEntries.durationMinutes})`))

  const totalMinutes = rows.reduce((acc, r) => acc + r.minutes, 0)
  return { range: input.range, rows, totalMinutes }
}

export type WorkHourReport = Awaited<ReturnType<typeof getWorkHourReportRecord>>

export async function getWorkHourAnalysisRecord(
  session: AuthSession,
  input: AnalysisInput,
) {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const days = RANGE_DAYS[input.range]
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - (days - 1))
  fromDate.setHours(0, 0, 0, 0)

  const scope = await analysisScope(session)
  const filters = [
    gte(timeEntries.workDate, toWorkDate(fromDate)),
    ...(input.projectId ? [eq(timeEntries.projectId, input.projectId)] : []),
  ]

  // รวมต่อวัน
  const dailyRows = await db
    .select({
      workDate: timeEntries.workDate,
      minutes: sql<number>`sum(${timeEntries.durationMinutes})::int`,
    })
    .from(timeEntries)
    .where(scope ? and(scope, ...filters) : and(...filters))
    .groupBy(timeEntries.workDate)

  const byDate = new Map(dailyRows.map((r) => [r.workDate, r.minutes]))
  const series = []
  for (let i = 0; i < days; i++) {
    const d = new Date(fromDate)
    d.setDate(d.getDate() + i)
    const key = toWorkDate(d)
    series.push({ date: key, minutes: byDate.get(key) ?? 0 })
  }

  // breakdown ต่อคน (สำหรับ manager/admin)
  const canViewTeam =
    (await hasPermission(session, Permissions.ReportsViewAll)) ||
    (await hasPermission(session, Permissions.ReportsViewTeam))
  const perUser = !canViewTeam
    ? []
    : await db
        .select({
          userId: timeEntries.userId,
          userName: user.name,
          minutes: sql<number>`sum(${timeEntries.durationMinutes})::int`,
        })
        .from(timeEntries)
        .innerJoin(user, eq(user.id, timeEntries.userId))
        .where(scope ? and(scope, ...filters) : and(...filters))
        .groupBy(timeEntries.userId, user.name)
        .orderBy(desc(sql`sum(${timeEntries.durationMinutes})`))

  const totalMinutes = series.reduce((acc, s) => acc + s.minutes, 0)
  return { range: input.range, series, totalMinutes, perUser }
}

export type WorkHourAnalysis = Awaited<
  ReturnType<typeof getWorkHourAnalysisRecord>
>

/** นาทีรวม 7 วันล่าสุดของตัวเอง (การ์ด "Hours this week") */
export async function getMyWeekMinutesRecord(session: AuthSession) {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const from = new Date()
  from.setDate(from.getDate() - 6)
  from.setHours(0, 0, 0, 0)

  const [row] = await db
    .select({
      minutes: sql<number>`coalesce(sum(${timeEntries.durationMinutes}), 0)::int`,
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, session.user.id),
        gte(timeEntries.workDate, toWorkDate(from)),
      ),
    )
  return row?.minutes ?? 0
}
