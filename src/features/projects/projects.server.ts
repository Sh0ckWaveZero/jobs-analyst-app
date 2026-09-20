import { and, eq, sql } from 'drizzle-orm'

import { getDb } from '@/db/client.server'
import { issues, projects, timeEntries, user } from '@/db/schema'
import type { AuthSession } from '@/features/auth/auth.server'
import { requireRole, requireSession } from '@/features/auth/auth.server'
import type { CreateProjectInput, UpdateProjectInput } from './projects.schema'

/**
 * โปรเจกต์อ่านได้ทุกบทบาทที่ล็อกอิน (member อ่านอย่างเดียว)
 * สร้าง/แก้ไข = admin ทุกโปรเจกต์, manager เฉพาะที่ตัวเองเป็นเจ้าของ
 */
async function assertProjectManageAccess(
  session: AuthSession,
  projectId: number,
) {
  requireRole(session, ['admin', 'manager'])
  if (session.user.role === 'manager') {
    const db = getDb()!
    const [row] = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
    if (!row) throw new Error('Project not found')
    if (row.ownerId !== session.user.id) {
      throw new Error('Forbidden — not the project owner')
    }
  }
}

/** โปรเจกต์ archived แล้วถือว่าปิดงาน ห้ามสร้าง issue/log เวลาใหม่ ต้อง unarchive ก่อน */
export async function assertProjectActive(projectId: number) {
  const db = getDb()!
  const [row] = await db
    .select({ status: projects.status })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!row) throw new Error('Project not found')
  if (row.status === 'archived') {
    throw new Error(
      'Project is archived — unarchive it before adding new work',
    )
  }
}

export async function getProjectsRecord() {
  const session = await requireSession()
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const rows = await db
    .select({
      id: projects.id,
      key: projects.key,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      ownerId: projects.ownerId,
      ownerName: user.name,
      createdAt: projects.createdAt,
      openIssues: sql<number>`(
        select count(*)::int from ${issues}
        where ${issues.projectId} = ${projects.id}
          and ${issues.status} <> 'done'
      )`,
      totalMinutes: sql<number>`(
        select coalesce(sum(${timeEntries.durationMinutes}), 0)::int
        from ${timeEntries}
        where ${timeEntries.projectId} = ${projects.id}
      )`,
    })
    .from(projects)
    .leftJoin(user, eq(user.id, projects.ownerId))
    .where(eq(projects.status, 'active'))
    .orderBy(projects.key)

  return { session: { role: session.user.role }, projects: rows }
}

export type ProjectRow = Awaited<
  ReturnType<typeof getProjectsRecord>
>['projects'][number]

/** โปรเจกต์ที่ archive แล้ว (ไว้โชว์ใน sidebar กลุ่ม Archived และเปิดดูรายละเอียดได้) */
export async function getArchivedProjectsRecord() {
  await requireSession()
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  return db
    .select({
      id: projects.id,
      key: projects.key,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      ownerId: projects.ownerId,
      ownerName: user.name,
      createdAt: projects.createdAt,
      openIssues: sql<number>`(
        select count(*)::int from ${issues}
        where ${issues.projectId} = ${projects.id}
          and ${issues.status} <> 'done'
      )`,
      totalMinutes: sql<number>`(
        select coalesce(sum(${timeEntries.durationMinutes}), 0)::int
        from ${timeEntries}
        where ${timeEntries.projectId} = ${projects.id}
      )`,
    })
    .from(projects)
    .leftJoin(user, eq(user.id, projects.ownerId))
    .where(eq(projects.status, 'archived'))
    .orderBy(projects.key)
}

export async function createProjectRecord(input: CreateProjectInput) {
  const session = await requireSession()
  requireRole(session, ['admin', 'manager'])
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [row] = await db
    .insert(projects)
    .values({
      key: input.key,
      name: input.name,
      description: input.description,
      ownerId: session.user.id,
    })
    .returning()
  return row
}

export async function updateProjectRecord(input: UpdateProjectInput) {
  const session = await requireSession()
  await assertProjectManageAccess(session, input.id)
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const { id, ...patch } = input
  const [row] = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(projects.id, id)))
    .returning()
  if (!row) throw new Error('Project not found')
  return row
}
