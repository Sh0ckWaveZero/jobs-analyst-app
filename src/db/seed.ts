/**
 * Seed ข้อมูล demo สำหรับพัฒนา: ผู้ใช้ admin/manager/member,
 * โปรเจกต์, issues และ time entries ย้อนหลัง 60 วัน
 * รันด้วย: bun run db:seed (ต้องตั้ง DATABASE_URL ก่อน)
 */
import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'

import { getDb } from './client.server'
import {
  account,
  departments,
  issues,
  projects,
  session,
  timeEntries,
  user,
  verification,
} from './schema'

const SEED_DAYS = 60

function daysAgo(n: number, hour = 9) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d
}

function toWorkDate(d: Date) {
  // workDate เป็น date column (mode string) → YYYY-MM-DD ตามเวลาท้องถิ่น
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function pick<T>(arr: readonly T[]): T {
  const value = arr[Math.floor(Math.random() * arr.length)]
  if (value === undefined) throw new Error('pick from empty array')
  return value
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  const db = getDb()
  if (!db) {
    console.error('DATABASE_URL is not set — cannot seed')
    process.exit(1)
  }

  // เคลียร์ของเดิมตามลำดับ FK (dev seed — ล้างแล้วใส่ใหม่ทั้งหมด)
  await db.delete(timeEntries)
  await db.delete(issues)
  await db.delete(projects)
  await db.delete(session)
  await db.delete(account)
  await db.delete(verification)
  await db.delete(user)
  await db.delete(departments)

  const password = await hashPassword('password123')

  // แผนก: Engineering (manager/admin), Marketing (member + member2 — ทดสอบ assign แทนกันในแผนก)
  const deptRows = await db
    .insert(departments)
    .values([{ name: 'Engineering' }, { name: 'Marketing' }])
    .returning()
  const deptId = (name: string) =>
    deptRows.find((d) => d.name === name)?.id ?? null

  const users = [
    {
      key: 'admin',
      email: 'admin@pm.local',
      name: 'Somchai Admin',
      role: 'admin',
      department: 'Engineering',
    },
    {
      key: 'manager',
      email: 'manager@pm.local',
      name: 'Mana Manager',
      role: 'manager',
      department: 'Engineering',
    },
    {
      key: 'member',
      email: 'member@pm.local',
      name: 'Nok Member',
      role: 'member',
      department: 'Marketing',
    },
    {
      key: 'member2',
      email: 'member2@pm.local',
      name: 'Oop Member',
      role: 'member',
      department: 'Marketing',
    },
  ] as const

  const userIds = {} as Record<
    'admin' | 'manager' | 'member' | 'member2',
    string
  >
  for (const u of users) {
    const id = randomUUID()
    userIds[u.key] = id
    await db.insert(user).values({
      id,
      email: u.email,
      name: u.name,
      role: u.role,
      departmentId: deptId(u.department),
      emailVerified: true,
      createdAt: daysAgo(SEED_DAYS + 5),
      updatedAt: new Date(),
    })
    await db.insert(account).values({
      id: randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password,
      createdAt: daysAgo(SEED_DAYS + 5),
      updatedAt: new Date(),
    })
  }

  const projectRows = await db
    .insert(projects)
    .values([
      {
        key: 'WEB',
        name: 'Website Revamp',
        description: 'ออกแบบและพัฒนาเว็บไซต์ใหม่ทั้งหมด',
        ownerId: userIds.manager,
      },
      {
        key: 'APP',
        name: 'Mobile App',
        description: 'แอปมือถือสำหรับลูกค้า iOS/Android',
        ownerId: userIds.admin,
      },
      {
        key: 'INFRA',
        name: 'Infrastructure',
        description: 'ปรับปรุง infra และ CI/CD',
        ownerId: userIds.manager,
      },
    ])
    .returning()

  const issueSeeds = [
    {
      p: 0,
      title: 'Finalize design system tokens',
      status: 'in_progress',
      priority: 'high',
      labels: ['design', 'frontend'],
    },
    {
      p: 0,
      title: 'Migrate marketing pages to new layout',
      status: 'todo',
      priority: 'medium',
      labels: ['frontend'],
    },
    {
      p: 0,
      title: 'SEO audit and meta templates',
      status: 'review',
      priority: 'medium',
      labels: ['seo'],
    },
    {
      p: 0,
      title: 'Dark mode support',
      status: 'backlog',
      priority: 'low',
      labels: ['frontend', 'design'],
    },
    {
      p: 1,
      title: 'Set up push notifications',
      status: 'todo',
      priority: 'high',
      labels: ['mobile'],
    },
    {
      p: 1,
      title: 'Offline caching layer',
      status: 'in_progress',
      priority: 'high',
      labels: ['mobile', 'data'],
    },
    {
      p: 1,
      title: 'Onboarding flow polish',
      status: 'done',
      priority: 'medium',
      labels: ['ux'],
    },
    {
      p: 1,
      title: 'Crash reporting integration',
      status: 'review',
      priority: 'low',
      labels: ['monitoring'],
    },
    {
      p: 2,
      title: 'Postgres backup automation',
      status: 'done',
      priority: 'high',
      labels: ['db'],
    },
    {
      p: 2,
      title: 'CI pipeline cache speedup',
      status: 'in_progress',
      priority: 'medium',
      labels: ['ci'],
    },
    {
      p: 2,
      title: 'Staging environment IaC',
      status: 'todo',
      priority: 'medium',
      labels: ['infra'],
    },
    {
      p: 2,
      title: 'Log retention policy',
      status: 'backlog',
      priority: 'low',
      labels: ['ops'],
    },
  ] as const

  const issueRows: (typeof issues.$inferInsert)[] = []
  const counters = [100, 100, 100]
  for (const s of issueSeeds) {
    const num = (counters[s.p] ?? 100) + randInt(1, 3)
    counters[s.p] = num
    const project = projectRows[s.p]
    if (!project) throw new Error('missing project for seed')
    issueRows.push({
      projectId: project.id,
      number: num,
      title: s.title,
      status: s.status,
      priority: s.priority,
      labels: [...s.labels],
      assigneeId: pick([userIds.member, userIds.manager, userIds.admin]),
      reporterId: userIds.member,
      dueDate: toWorkDate(daysAgo(-randInt(3, 30))),
    })
  }
  const insertedIssues = await db.insert(issues).values(issueRows).returning()

  // time entries ย้อนหลัง 60 วัน (ข้ามเสาร์-อาทิตย์) ให้กราฟวิเคราะห์มีข้อมูล
  const allUserIds: string[] = [
    userIds.admin,
    userIds.manager,
    userIds.member,
    userIds.member2,
  ]
  const entries: (typeof timeEntries.$inferInsert)[] = []
  for (let d = SEED_DAYS; d >= 0; d--) {
    const day = daysAgo(d)
    const dow = day.getDay()
    if (dow === 0 || dow === 6) continue
    for (const uid of allUserIds) {
      const n = randInt(1, 3)
      for (let i = 0; i < n; i++) {
        const issue = pick(insertedIssues)
        const hour = 9 + i * 3
        const startedAt = daysAgo(d, hour)
        const minutes = randInt(4, 16) * 15
        const endedAt = new Date(startedAt.getTime() + minutes * 60_000)
        entries.push({
          projectId: issue.projectId,
          issueId: issue.id,
          userId: uid,
          startedAt,
          endedAt,
          durationMinutes: minutes,
          note: null,
          workDate: toWorkDate(startedAt),
        })
      }
    }
  }
  // chunk insert กัน bind ล้น
  for (let i = 0; i < entries.length; i += 200) {
    await db.insert(timeEntries).values(entries.slice(i, i + 200))
  }

  console.log(
    `Seeded ${users.length} users, ${projectRows.length} projects, ${insertedIssues.length} issues, ${entries.length} time entries`,
  )
  console.log('Demo logins (password: password123):')
  for (const u of users) console.log(`  ${u.email} (${u.role})`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
