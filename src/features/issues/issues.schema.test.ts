import { describe, expect, it } from 'vitest'

import {
  createIssueInputSchema,
  listIssuesInputSchema,
  updateIssueInputSchema,
} from './issues.schema'

describe('createIssueInputSchema', () => {
  const valid = { projectId: 16, title: 'Dark mode support' }

  it('status/priority มีค่า default', () => {
    const parsed = createIssueInputSchema.parse(valid)
    expect(parsed.status).toBe('todo')
    expect(parsed.priority).toBe('medium')
  })

  it('priority นอก enum ไม่ผ่าน', () => {
    expect(
      createIssueInputSchema.safeParse({ ...valid, priority: 'urgent' })
        .success,
    ).toBe(false)
  })

  it('dueDate ต้องเป็นรูปแบบ YYYY-MM-DD', () => {
    expect(
      createIssueInputSchema.safeParse({ ...valid, dueDate: '2026-10-06' })
        .success,
    ).toBe(true)
    expect(
      createIssueInputSchema.safeParse({ ...valid, dueDate: '06/10/2026' })
        .success,
    ).toBe(false)
  })

  it('labels ได้สูงสุด 6 ชื่อ ชื่อละไม่เกิน 30 ตัวอักษร', () => {
    expect(
      createIssueInputSchema.safeParse({
        ...valid,
        labels: Array.from({ length: 7 }, (_, i) => `l${i}`),
      }).success,
    ).toBe(false)
    expect(
      createIssueInputSchema.safeParse({
        ...valid,
        labels: ['x'.repeat(31)],
      }).success,
    ).toBe(false)
    expect(
      createIssueInputSchema.safeParse({
        ...valid,
        labels: Array.from({ length: 6 }, (_, i) => `l${i}`),
      }).success,
    ).toBe(true)
  })

  it('title ว่างไม่ได้', () => {
    expect(createIssueInputSchema.safeParse({ ...valid, title: '' }).success)
      .toBe(false)
  })
})

describe('updateIssueInputSchema', () => {
  it('เอา assignee ออกได้ด้วย null', () => {
    expect(
      updateIssueInputSchema.safeParse({ id: 1, assigneeId: null }).success,
    ).toBe(true)
  })

  it('status ต้องเป็นค่าใน enum เท่านั้น', () => {
    expect(
      updateIssueInputSchema.safeParse({ id: 1, status: 'done' }).success,
    ).toBe(true)
    expect(
      updateIssueInputSchema.safeParse({ id: 1, status: 'cancelled' })
        .success,
    ).toBe(false)
  })
})

describe('listIssuesInputSchema', () => {
  it('limit ได้สูงสุด 200 และต้องเป็นบวก', () => {
    expect(listIssuesInputSchema.safeParse({ limit: 200 }).success).toBe(true)
    expect(listIssuesInputSchema.safeParse({ limit: 201 }).success).toBe(false)
    expect(listIssuesInputSchema.safeParse({ limit: 0 }).success).toBe(false)
  })

  it('ไม่ส่ง filter ใดเลยก็ได้', () => {
    expect(listIssuesInputSchema.parse({})).toEqual({})
  })
})
