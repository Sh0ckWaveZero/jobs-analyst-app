import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('รวม class หลายตัวเป็น string เดียว', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('ข้ามค่า falsy', () => {
    // ใช้ parameter กัน eslint/tsc narrow ค่าเป็น literal
    const classes = (showX: boolean) => cn('a', showX && 'x', 'c')
    expect(classes(false)).toBe('a c')
    expect(classes(true)).toBe('a x c')
  })

  it('tailwind-merge ตัด conflict โดยค่าหลังชนะ', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })
})
