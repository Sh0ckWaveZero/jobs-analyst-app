import { describe, expect, it } from 'vitest'

import {
  addManualEntryInputSchema,
  analysisInputSchema,
  issueEntriesInputSchema,
  startTimerInputSchema,
  stopTimerInputSchema,
  updateEntryInputSchema,
} from './time-entries.schema'

describe('startTimerInputSchema', () => {
  it('projectId บวก + issueId/note optional', () => {
    expect(
      startTimerInputSchema.safeParse({ projectId: 16 }).success,
    ).toBe(true)
    expect(
      startTimerInputSchema.safeParse({
        projectId: 16,
        issueId: 102,
        note: 'ทำงานต่อ',
      }).success,
    ).toBe(true)
    expect(
      startTimerInputSchema.safeParse({ projectId: 0 }).success,
    ).toBe(false)
  })
})

describe('stopTimerInputSchema', () => {
  it('entryId ต้องเป็นจำนวนเต็มบวก', () => {
    expect(stopTimerInputSchema.safeParse({ entryId: 5 }).success).toBe(true)
    expect(stopTimerInputSchema.safeParse({ entryId: -1 }).success).toBe(false)
  })
})

describe('addManualEntryInputSchema', () => {
  const valid = { projectId: 16, workDate: '2026-09-19', minutes: 90 }

  it('รับ entry ที่ถูกต้อง', () => {
    expect(addManualEntryInputSchema.parse(valid)).toEqual(valid)
  })

  it('minutes ต้องอยู่ระหว่าง 1–1440 นาที (24 ชม.)', () => {
    expect(
      addManualEntryInputSchema.safeParse({ ...valid, minutes: 0 }).success,
    ).toBe(false)
    expect(
      addManualEntryInputSchema.safeParse({ ...valid, minutes: 1441 }).success,
    ).toBe(false)
    expect(
      addManualEntryInputSchema.safeParse({ ...valid, minutes: 1440 }).success,
    ).toBe(true)
  })

  it('workDate ต้องเป็น YYYY-MM-DD', () => {
    expect(
      addManualEntryInputSchema.safeParse({ ...valid, workDate: '19/09/2026' })
        .success,
    ).toBe(false)
  })
})

describe('updateEntryInputSchema', () => {
  it('แก้ทุกฟิลด์พร้อมกันได้', () => {
    expect(
      updateEntryInputSchema.safeParse({
        id: 5,
        minutes: 105,
        workDate: '2026-09-19',
        note: 'แก้ไขบันทึก',
      }).success,
    ).toBe(true)
  })

  it('แก้เฉพาะ minutes อย่างเดียวได้', () => {
    expect(updateEntryInputSchema.safeParse({ id: 5, minutes: 30 }).success)
      .toBe(true)
  })

  it('note เป็น null ได้ (ล้างหมายเหตุ)', () => {
    expect(updateEntryInputSchema.safeParse({ id: 5, note: null }).success).toBe(
      true,
    )
  })

  it('minutes ต้องไม่เกิน 1440 และ id ต้องบวก', () => {
    expect(
      updateEntryInputSchema.safeParse({ id: 5, minutes: 1441 }).success,
    ).toBe(false)
    expect(updateEntryInputSchema.safeParse({ id: 0 }).success).toBe(false)
  })

  it('workDate ต้องเป็น YYYY-MM-DD', () => {
    expect(
      updateEntryInputSchema.safeParse({ id: 5, workDate: '2026/09/19' })
        .success,
    ).toBe(false)
  })
})

describe('issueEntriesInputSchema', () => {
  it('ต้องมี issueId เป็นจำนวนเต็มบวก', () => {
    expect(issueEntriesInputSchema.safeParse({ issueId: 102 }).success).toBe(
      true,
    )
    expect(issueEntriesInputSchema.safeParse({ issueId: 0 }).success).toBe(
      false,
    )
    expect(issueEntriesInputSchema.safeParse({}).success).toBe(false)
  })
})

describe('analysisInputSchema', () => {
  it('range ต้องเป็นค่าใน enum', () => {
    expect(analysisInputSchema.safeParse({ range: '2W' }).success).toBe(true)
    expect(analysisInputSchema.safeParse({ range: '3Y' }).success).toBe(false)
  })

  it('กรองตาม projectId ได้', () => {
    expect(
      analysisInputSchema.safeParse({ range: '1M', projectId: 17 }).success,
    ).toBe(true)
  })
})
