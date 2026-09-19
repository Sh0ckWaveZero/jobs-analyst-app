import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let _db: PostgresJsDatabase<typeof schema> | null = null

/**
 * คืน drizzle client ถ้าตั้ง DATABASE_URL ไว้ ถ้าไม่ได้ตั้งคืน null
 * (server functions ทุกตัวต้องรองรับกรณี null = โหมด mock)
 * เรียกใช้ได้เฉพาะใน server functions เท่านั้น — ห้าม import ใน client component
 */
export function getDb(): PostgresJsDatabase<typeof schema> | null {
  const url = process.env.DATABASE_URL
  if (!url) return null
  if (!_db) {
    _db = drizzle(postgres(url), { schema })
  }
  return _db
}
