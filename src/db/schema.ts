import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { Role } from '@/lib/roles'

// ── Better Auth tables (โครงสร้างตาม docs better-auth v1.7.5) ──

/** แผนก — ใช้กำหนดขอบเขตการ assign งานแทนกัน */
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Role catalog — built-in roles และ custom roles ที่ admin สร้างเอง */
export const accessRoles = pgTable('access_roles', {
  key: text('key').primaryKey(),
  label: text('label').notNull(),
  description: text('description').notNull().default(''),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Permission catalog — system capabilities และ custom permissions ที่ admin เพิ่มเอง */
export const permissions = pgTable('permissions', {
  key: text('key').primaryKey(),
  permissionGroup: text('group').notNull(),
  label: text('label').notNull(),
  description: text('description').notNull().default(''),
  isSystem: boolean('is_system').notNull().default(false),
  protectedForAdmin: boolean('protected_for_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Permission override ต่อ role — ถ้าไม่มี row จะใช้ค่า default จาก lib/rbac */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    role: text('role')
      .notNull()
      .references(() => accessRoles.key, { onDelete: 'cascade' }),
    permission: text('permission')
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.role, table.permission] })],
)

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  username: text('username'),
  phoneNumber: text('phone_number'),
  status: text('status', {
    enum: ['active', 'inactive', 'invited', 'suspended'],
  })
    .notNull()
    .default('active'),
  role: text('role')
    .notNull()
    .default(Role.Member)
    .references(() => accessRoles.key),
  departmentId: integer('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ── Project Management ──

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  /** ตัวย่อหน้า issue id เช่น "RFC" → RFC-101 */
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'archived'] })
    .notNull()
    .default('active'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const issues = pgTable(
  'issues',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** เลขรันต่อโปรเจกต์ แสดงเป็น `${project.key}-${number}` */
    number: integer('number').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', {
      enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
    })
      .notNull()
      .default('todo'),
    priority: text('priority', { enum: ['low', 'medium', 'high'] })
      .notNull()
      .default('medium'),
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    reporterId: text('reporter_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    dueDate: date('due_date'),
    labels: text('labels')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** เวลาคงเหลือโดยประมาณ (นาที) — ตั้ง/ปรับผ่าน Log Work dialog เท่านั้น */
    remainingEstimateMinutes: integer('remaining_estimate_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // กัน race condition ตอนสร้าง issue พร้อมกัน — DB ปฏิเสธเลขซ้ำแทนที่จะเงียบๆ ยอมให้ผ่าน
    uniqueIndex('issues_project_number_unique').on(t.projectId, t.number),
  ],
)

export const timeEntries = pgTable(
  'time_entries',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** null ได้เมื่อลงเวลาที่โปรเจกต์โดยตรงไม่ผูก issue */
    issueId: integer('issue_id').references(() => issues.id, {
      onDelete: 'set null',
    }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** null = tracker กำลังรันอยู่ */
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationMinutes: integer('duration_minutes').notNull().default(0),
    note: text('note'),
    /** วันที่เป็นทางการสำหรับรวมชั่วโมงรายวัน (YYYY-MM-DD) */
    workDate: date('work_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('time_entries_user_date_idx').on(t.userId, t.workDate),
    index('time_entries_project_date_idx').on(t.projectId, t.workDate),
  ],
)

export type Role = NonNullable<User['role']>
export type ProjectStatus = Project['status']
export type IssueStatus = NonNullable<Issue['status']>
export type IssuePriority = NonNullable<Issue['priority']>

export type Department = typeof departments.$inferSelect
export type Permission = typeof permissions.$inferSelect
export type RolePermission = typeof rolePermissions.$inferSelect
export type AccessRole = typeof accessRoles.$inferSelect
export type User = typeof user.$inferSelect
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Issue = typeof issues.$inferSelect
export type NewIssue = typeof issues.$inferInsert
export type TimeEntry = typeof timeEntries.$inferSelect
export type NewTimeEntry = typeof timeEntries.$inferInsert
