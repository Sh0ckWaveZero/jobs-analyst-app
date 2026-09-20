/**
 * Enum กลางของบทบาทผู้ใช้ — single source สำหรับ db schema, zod validation,
 * better-auth config และทุกจุดตรวจสิทธิ์ ห้ามพิมพ์ literal 'admin'/'manager'/'member'
 * ใหม่นอกไฟล์นี้
 */
export const USER_ROLES = ['admin', 'manager', 'member'] as const

export type UserRole = (typeof USER_ROLES)[number]

export function isBuiltInRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value)
}

export const Role = {
  Admin: 'admin',
  Manager: 'manager',
  Member: 'member',
} as const satisfies Record<string, UserRole>
