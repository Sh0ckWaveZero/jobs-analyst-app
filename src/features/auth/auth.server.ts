import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { and, eq } from 'drizzle-orm'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { getDb } from '@/db/client.server'
import * as schema from '@/db/schema'
import { rolePermissions } from '@/db/schema'
import { defaultHasPermission } from '@/lib/rbac'
import type { PermissionKey } from '@/lib/rbac'
import { Role } from '@/lib/roles'
import type { UserRole } from '@/lib/roles'

const db = getDb()
if (!db) {
  // auth ต้องใช้ DB เสมอ (session/credential เก็บใน Postgres)
  throw new Error('DATABASE_URL is not set — better-auth requires a database')
}
const authDb = db

// dev เท่านั้น — ครอบคลุม localhost + LAN IP ทั่วไป เพื่อทดสอบข้ามเครื่องได้
const DEV_ALLOWED_HOSTS = [
  'localhost:3000',
  '127.0.0.1:3000',
  '192.168.*:3000',
  '10.*:3000',
  '172.*:3000',
  '100.*:3000',
]

/**
 * BETTER_AUTH_URL ต้องเป็น absolute URL — ถ้าค่าใน env ผิด (เช่น ใส่สลับกับ secret)
 * ข้ามค่านั้นไปใช้ dynamic host allowlist แทน ไม่เช่นนั้น server จะ crash ตอน boot
 *
 * ห้ามปล่อย baseURL เป็น undefined เฉยๆ ตอนไม่ตั้ง env — เจอบั๊กจริงว่า better-auth
 * คำนวณ origin ไม่นิ่งพอที่จะออก Set-Cookie ถูกต้องเสมอ ทำให้ session cookie หายกลาง
 * อากาศเป็นระยะ ใช้ dynamic baseURL + allowedHosts แทน ปลอดภัยกว่า (มี allowlist)
 * และยังรองรับ localhost คู่กับ IP วง LAN เหมือนเดิม
 */
function resolveBaseURL():
  string | { allowedHosts: string[]; fallback: string } {
  const raw = process.env.BETTER_AUTH_URL
  if (raw) {
    try {
      if (new URL(raw).origin !== 'null') return raw
    } catch {
      // better-auth อ่าน env นี้เองตอน init — ต้องลบทิ้งจาก process ด้วย
      delete process.env.BETTER_AUTH_URL
      console.warn(
        `Ignoring invalid BETTER_AUTH_URL ("${raw.slice(0, 8)}…") — falling back to host allowlist. ตั้งค่าเป็น absolute URL เช่น http://localhost:3000`,
      )
    }
  }
  return { allowedHosts: DEV_ALLOWED_HOSTS, fallback: 'http://localhost:3000' }
}

export const auth = betterAuth({
  baseURL: resolveBaseURL(),
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: Role.Member,
        // ห้ามผู้ใช้ตั้ง role เองตอน signup — เปลี่ยนได้ทาง admin/seed เท่านั้น
        input: false,
      },
      departmentId: {
        type: 'string',
        required: false,
        // admin เป็นผู้กำหนดแผนกผ่านหน้าจัดการ user เท่านั้น
        input: false,
      },
    },
  },
  plugins: [tanstackStartCookies()],
})

export type AuthSession = typeof auth.$Infer.Session

/** ดึง session จาก request ปัจจุบัน (ใช้ใน *.server.ts เท่านั้น) */
export async function getAuthSession(): Promise<AuthSession | null> {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) return null

  const [currentUser] = await authDb
    .select({ status: schema.user.status })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1)

  if (
    currentUser?.status === 'inactive' ||
    currentUser?.status === 'suspended'
  ) {
    return null
  }

  return session
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getAuthSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

/** บังคับบทบาท — ผู้ใช้ต้องมี role ในรายการที่อนุญาต */
export function requireRole(
  session: AuthSession,
  roles: readonly UserRole[],
): void {
  const role = session.user.role
  if (!role || !roles.includes(role as UserRole)) {
    throw new Error(`Forbidden — requires role: ${roles.join(' or ')}`)
  }
}

/** ตรวจ permission จาก override ใน DB และ fallback เป็น built-in role defaults */
export async function hasPermission(
  session: AuthSession,
  permission: PermissionKey,
): Promise<boolean> {
  const role = session.user.role
  if (!role) return false

  const permissionDb = getDb()
  if (!permissionDb) return defaultHasPermission(role, permission)

  const [override] = await permissionDb
    .select({ enabled: rolePermissions.enabled })
    .from(rolePermissions)
    .where(
      and(
        eq(rolePermissions.role, role),
        eq(rolePermissions.permission, permission),
      ),
    )
    .limit(1)

  return override?.enabled ?? defaultHasPermission(role, permission)
}

export async function requirePermission(
  session: AuthSession,
  permission: PermissionKey,
): Promise<void> {
  if (!(await hasPermission(session, permission))) {
    throw new Error(`Forbidden — missing permission: ${permission}`)
  }
}
