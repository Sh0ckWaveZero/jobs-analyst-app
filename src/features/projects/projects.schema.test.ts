import { describe, expect, it } from 'vitest'

import {
  createProjectInputSchema,
  updateProjectInputSchema,
} from './projects.schema'

describe('createProjectInputSchema', () => {
  it('รับ input ที่ถูกต้อง', () => {
    const parsed = createProjectInputSchema.parse({
      key: 'WEB',
      name: 'Website Revamp',
      description: 'โปรเจกต์เว็บใหม่',
    })
    expect(parsed.key).toBe('WEB')
    expect(parsed.name).toBe('Website Revamp')
  })

  it('description เป็น optional', () => {
    expect(() =>
      createProjectInputSchema.parse({ key: 'APP', name: 'Mobile App' }),
    ).not.toThrow()
  })

  it('key ต้องเป็นตัวพิมพ์ใหญ่ล้วน', () => {
    const result = createProjectInputSchema.safeParse({
      key: 'web',
      name: 'Website',
    })
    expect(result.success).toBe(false)
  })

  it('key มีตัวเลขหรือสัญลักษณ์ไม่ได้', () => {
    expect(
      createProjectInputSchema.safeParse({ key: 'W3B', name: 'X' }).success,
    ).toBe(false)
    expect(
      createProjectInputSchema.safeParse({ key: 'W-B', name: 'X' }).success,
    ).toBe(false)
  })

  it('key สั้นสุด 2 ตัว ยาวสุด 10 ตัว', () => {
    expect(
      createProjectInputSchema.safeParse({ key: 'W', name: 'X' }).success,
    ).toBe(false)
    expect(
      createProjectInputSchema.safeParse({ key: 'A'.repeat(11), name: 'X' })
        .success,
    ).toBe(false)
  })

  it('name ว่างไม่ได้ และยาวสุด 120', () => {
    expect(
      createProjectInputSchema.safeParse({ key: 'WEB', name: '' }).success,
    ).toBe(false)
    expect(
      createProjectInputSchema.safeParse({ key: 'WEB', name: 'x'.repeat(121) })
        .success,
    ).toBe(false)
  })
})

describe('updateProjectInputSchema', () => {
  it('status ต้องเป็น active หรือ archived', () => {
    expect(
      updateProjectInputSchema.safeParse({ id: 1, status: 'active' }).success,
    ).toBe(true)
    expect(
      updateProjectInputSchema.safeParse({ id: 1, status: 'archived' })
        .success,
    ).toBe(true)
    expect(
      updateProjectInputSchema.safeParse({ id: 1, status: 'deleted' })
        .success,
    ).toBe(false)
  })

  it('id ต้องเป็นจำนวนเต็มบวก', () => {
    expect(updateProjectInputSchema.safeParse({ id: 0 }).success).toBe(false)
    expect(updateProjectInputSchema.safeParse({ id: 1.5 }).success).toBe(false)
  })
})
