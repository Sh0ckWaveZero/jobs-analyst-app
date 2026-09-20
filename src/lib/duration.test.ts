import { describe, expect, it } from 'vitest'

import { formatDuration, parseDuration } from './duration'

describe('parseDuration', () => {
  it.each([
    ['1h 45m', 105],
    ['1h45m', 105],
    ['45m', 45],
    ['2h', 120],
    ['90', 90],
    ['1:45', 105],
    ['0:30', 30],
    ['10:15:30', 615],
    ['2H 30M', 150], // พิมพ์ใหญ่ได้
    ['  1h   45m  ', 105], // ช่องว่างรอบ ๆ / ตรงกลางเยอะได้
    ['30m 1h', 90], // สลับลำดับได้
    ['1h 0m', 60],
    ['1d', 1440], // หน่วยวัน
    ['1w', 10080], // หน่วยสัปดาห์
    ['2w 4d 6h 45m', 26325], // ครบทุกหน่วยแบบในคำแนะนำของฟอร์ม
  ])('parseDuration(%j) = %i นาที', (input, expected) => {
    expect(parseDuration(input)).toBe(expected)
  })

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['1x'],
    ['1h 45x'],
    ['-30m'],
    ['0'],
    ['0m'],
    ['0:00'],
    ['1:99'], // นาทีเกิน 59 ในรูปแบบ clock
    ['61d'], // เกิน 60 วัน
  ])('parseDuration(%j) = null', (input) => {
    expect(parseDuration(input)).toBeNull()
  })

  it('ยอมรับสูงสุด 60 วัน (86400 นาที)', () => {
    expect(parseDuration('60d')).toBe(86400)
    expect(parseDuration('86400')).toBe(86400)
  })
})

describe('formatDuration', () => {
  it.each([
    [105, '1h 45m'],
    [60, '1h'],
    [45, '45m'],
    [0, '0m'],
    [120, '2h'],
    [1440, '1d'],
    [1470, '1d 30m'],
    [1500, '1d 1h'],
  ])('formatDuration(%i) = %j', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })
})
