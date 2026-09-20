import { aliasedTable, and, desc, eq, sql } from 'drizzle-orm'

import { getDb } from '@/db/client.server'
import { issues, projects, user } from '@/db/schema'
import {
  hasPermission,
  requirePermission,
  requireSession,
} from '@/features/auth/auth.server'
import type { AuthSession } from '@/features/auth/auth.server'
import { assertProjectActive } from '@/features/projects/projects.server'
import { Permissions } from '@/lib/rbac'
import type {
  CreateIssueInput,
  ListIssuesInput,
  UpdateIssueInput,
} from './issues.schema'

/**
 * อ่าน: ทุกบทบาทที่ล็อกอิน
 * แก้ไข: admin ทุก issue, manager ในโปรเจกต์ที่ตัวเองเป็นเจ้าของ,
 *        member เฉพาะ issue ที่ตัวเองเป็น reporter หรือ assignee
 * โปรเจกต์ archived แล้ว = ปิดงาน แก้ไข issue ต่อไม่ได้จนกว่าจะ unarchive
 */
async function assertIssueManageAccess(session: AuthSession, issueId: number) {
  const db = getDb()!
  const [row] = await db
    .select({
      reporterId: issues.reporterId,
      assigneeId: issues.assigneeId,
      ownerId: projects.ownerId,
      projectStatus: projects.status,
    })
    .from(issues)
    .innerJoin(projects, eq(projects.id, issues.projectId))
    .where(eq(issues.id, issueId))
    .limit(1)
  if (!row) throw new Error('Issue not found')
  if (row.projectStatus === 'archived') {
    throw new Error(
      'Project is archived — unarchive it before editing this issue',
    )
  }

  if (await hasPermission(session, Permissions.IssuesManageAll)) return
  if (
    (await hasPermission(session, Permissions.IssuesManageOwned)) &&
    row.ownerId === session.user.id
  )
    return
  if (
    (await hasPermission(session, Permissions.IssuesManageAssigned)) &&
    (row.reporterId === session.user.id || row.assigneeId === session.user.id)
  )
    return
  throw new Error('Forbidden — cannot modify this issue')
}

const assignee = aliasedTable(user, 'assignee')
const reporter = aliasedTable(user, 'reporter')

function baseIssueSelect() {
  return {
    id: issues.id,
    projectId: issues.projectId,
    projectKey: projects.key,
    projectName: projects.name,
    number: issues.number,
    title: issues.title,
    description: issues.description,
    status: issues.status,
    priority: issues.priority,
    dueDate: issues.dueDate,
    labels: issues.labels,
    remainingEstimateMinutes: issues.remainingEstimateMinutes,
    createdAt: issues.createdAt,
    updatedAt: issues.updatedAt,
    assigneeId: issues.assigneeId,
    assigneeName: assignee.name,
    reporterId: issues.reporterId,
    reporterName: reporter.name,
    /** เวลารวมที่ลงใน issue นี้ (นาที) */
    totalMinutes: sql<number>`(
      select coalesce(sum(t.duration_minutes), 0)::int
      from time_entries t where t.issue_id = ${issues.id}
    )`,
  }
}

export async function listIssuesRecord(input: ListIssuesInput) {
  await requireSession()
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const filters = []
  if (input.projectId) filters.push(eq(issues.projectId, input.projectId))
  if (input.assigneeId) filters.push(eq(issues.assigneeId, input.assigneeId))
  if (input.reporterId) filters.push(eq(issues.reporterId, input.reporterId))
  if (input.status) filters.push(eq(issues.status, input.status))

  const rows = await db
    .select(baseIssueSelect())
    .from(issues)
    .innerJoin(projects, eq(projects.id, issues.projectId))
    .leftJoin(assignee, eq(assignee.id, issues.assigneeId))
    .leftJoin(reporter, eq(reporter.id, issues.reporterId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(issues.createdAt))
    .limit(input.limit ?? 100)

  return rows.map((r) => ({
    ...r,
    key: `${r.projectKey}-${r.number}`,
  }))
}

export type IssueRow = Awaited<ReturnType<typeof listIssuesRecord>>[number]

/**
 * กติกาการ assign ตามบทบาท:
 * admin/manager → assign ให้ใครก็ได้
 * member → assign ให้ตัวเอง หรือคนในแผนกเดียวกันเท่านั้น (assign แทนกัน)
 */
async function assertAssigneeAllowed(
  session: AuthSession,
  assigneeId: string | null | undefined,
) {
  if (!assigneeId) return
  if (await hasPermission(session, Permissions.IssuesAssignAny)) return
  await requirePermission(session, Permissions.IssuesAssignDepartment)
  if (assigneeId === session.user.id) return

  const db = getDb()!
  const me = await db
    .select({ departmentId: user.departmentId })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
  const myDepartmentId = me[0]?.departmentId
  if (!myDepartmentId) {
    throw new Error('Forbidden — join a department to assign others')
  }

  const assigneeRow = await db
    .select({ departmentId: user.departmentId })
    .from(user)
    .where(eq(user.id, assigneeId))
    .limit(1)
  if (assigneeRow[0]?.departmentId === myDepartmentId) return

  throw new Error(
    'Forbidden — members can only assign themselves or colleagues in the same department',
  )
}

const UNIQUE_VIOLATION = '23505'
const MAX_NUMBER_ATTEMPTS = 5

export async function createIssueRecord(input: CreateIssueInput) {
  const session = await requireSession()
  await requirePermission(session, Permissions.IssuesCreate)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')
  await assertProjectActive(input.projectId)
  await assertAssigneeAllowed(session, input.assigneeId)

  // เลขรันต่อโปรเจกต์: max + 1 (เริ่มที่ 101 ตาม ref) — DB มี unique
  // constraint กัน (projectId, number) ซ้ำ ถ้าสร้างพร้อมกันแล้วเลขชนกัน
  // ให้อ่าน max ใหม่แล้วลองอีกครั้งแทนที่จะปล่อยให้ error หลุดออกไปตรงๆ
  for (let attempt = 1; attempt <= MAX_NUMBER_ATTEMPTS; attempt++) {
    const [maxRow] = await db
      .select({
        maxNumber: sql<number>`coalesce(max(${issues.number}), 100)`,
      })
      .from(issues)
      .where(eq(issues.projectId, input.projectId))
    const maxNumber = maxRow?.maxNumber ?? 100

    try {
      const [row] = await db
        .insert(issues)
        .values({
          projectId: input.projectId,
          number: maxNumber + 1,
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          assigneeId: input.assigneeId || null,
          reporterId: session.user.id,
          dueDate: input.dueDate,
          labels: input.labels ?? [],
        })
        .returning()
      return row
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      if (code !== UNIQUE_VIOLATION || attempt === MAX_NUMBER_ATTEMPTS) {
        throw err
      }
    }
  }
  throw new Error('Failed to create issue — number conflicts, please retry')
}

export async function updateIssueRecord(input: UpdateIssueInput) {
  const session = await requireSession()
  await assertIssueManageAccess(session, input.id)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')
  if ('assigneeId' in input) {
    await assertAssigneeAllowed(session, input.assigneeId ?? null)
  }

  const { id, ...patch } = input
  const [row] = await db
    .update(issues)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(issues.id, id))
    .returning()
  if (!row) throw new Error('Issue not found')
  return row
}

export async function deleteIssueRecord(issueId: number) {
  const session = await requireSession()
  await assertIssueManageAccess(session, issueId)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  await db.delete(issues).where(eq(issues.id, issueId))
  return { ok: true as const }
}

/** สถิติหน้า dashboard ของฉัน */

export async function getDashboardCountsRecord(session: AuthSession) {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')
  const uid = session.user.id

  // สาม query อิสระต่อกัน — ยิงขนาน
  const [[created], [assigned], statusRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(issues)
      .where(eq(issues.reporterId, uid)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(issues)
      .where(eq(issues.assigneeId, uid)),
    db
      .select({ status: issues.status, count: sql<number>`count(*)::int` })
      .from(issues)
      .where(eq(issues.assigneeId, uid))
      .groupBy(issues.status),
  ])

  const counts = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  } as Record<string, number>
  for (const r of statusRows) counts[r.status] = r.count

  return {
    created: created?.count ?? 0,
    assigned: assigned?.count ?? 0,
    statusCounts: counts,
  }
}
