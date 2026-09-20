import { describe, expect, it } from 'vitest'

import {
  createDepartmentInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
} from './users.schema'

describe('createUserInputSchema', () => {
  const valid = {
    name: 'Somchai Admin',
    email: 'somchai@pm.local',
    password: 'password123',
    role: 'admin',
    departmentId: null,
  }

  it('รับ input ที่ถูกต้อง', () => {
    expect(createUserInputSchema.parse(valid)).toEqual(valid)
  })

  it('email ถูก trim และแปลงเป็นตัวพิมพ์เล็กก่อนตรวจ', () => {
    const parsed = createUserInputSchema.parse({
      ...valid,
      email: '  Somchai@PM.Local ',
    })
    expect(parsed.email).toBe('somchai@pm.local')
  })

  it('email ไม่ถูกต้องไม่ผ่าน', () => {
    expect(
      createUserInputSchema.safeParse({ ...valid, email: 'not-an-email' })
        .success,
    ).toBe(false)
  })

  it('password สั้นกว่า 8 ตัวไม่ผ่าน', () => {
    expect(
      createUserInputSchema.safeParse({ ...valid, password: '1234567' })
        .success,
    ).toBe(false)
    expect(
      createUserInputSchema.safeParse({ ...valid, password: '12345678' })
        .success,
    ).toBe(true)
  })

  it('role key รับ custom role ได้แต่ห้ามว่าง', () => {
    expect(
      createUserInputSchema.safeParse({ ...valid, role: 'custom_project_lead' })
        .success,
    ).toBe(true)
    expect(
      createUserInputSchema.safeParse({ ...valid, role: ' ' }).success,
    ).toBe(false)
  })

  it('departmentId ต้องเป็น int บวก หรือ null', () => {
    expect(
      createUserInputSchema.safeParse({ ...valid, departmentId: 0 }).success,
    ).toBe(false)
    expect(
      createUserInputSchema.safeParse({ ...valid, departmentId: 3 }).success,
    ).toBe(true)
  })
})

describe('updateUserInputSchema', () => {
  it('แก้ role อย่างเดียวได้', () => {
    expect(
      updateUserInputSchema.safeParse({ id: 'u1', role: 'manager' }).success,
    ).toBe(true)
  })

  it('password ถ้าส่งมาต้องยาวอย่างน้อย 8', () => {
    expect(
      updateUserInputSchema.safeParse({ id: 'u1', password: 'short' }).success,
    ).toBe(false)
  })
})

describe('createDepartmentInputSchema', () => {
  it('ชื่อแผนก trim ค่าว่างไม่ได้', () => {
    expect(createDepartmentInputSchema.safeParse({ name: '   ' }).success).toBe(
      false,
    )
  })

  it('ชื่อแผนกยาวสุด 60 ตัว', () => {
    expect(
      createDepartmentInputSchema.safeParse({ name: 'ด'.repeat(61) }).success,
    ).toBe(false)
    expect(
      createDepartmentInputSchema.safeParse({ name: 'ด'.repeat(60) }).success,
    ).toBe(true)
  })
})
