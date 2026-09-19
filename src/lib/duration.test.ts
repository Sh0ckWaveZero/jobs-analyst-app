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
    ['24h 1m'], // เกิน 24 ชั่วโมง
    ['1441'],
  ])('parseDuration(%j) = null', (input) => {
    expect(parseDuration(input)).toBeNull()
  })

  it('ยอมรับสูงสุด 24 ชั่วโมง (1440)', () => {
    expect(parseDuration('24h')).toBe(1440)
    expect(parseDuration('1440')).toBe(1440)
  })
})

describe('formatDuration', () => {
  it.each([
    [105, '1h 45m'],
    [60, '1h'],
    [45, '45m'],
    [0, '0m'],
    [120, '2h'],
  ])('formatDuration(%i) = %j', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })
})
