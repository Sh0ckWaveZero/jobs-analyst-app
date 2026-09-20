// ตัวช่วยแปลงข้อความเวลาแบบสั้น (Jira-style) เป็นนาที
// รองรับ: "2w 4d 6h 45m", "1h 45m", "1h45m", "45m", "2h", "1:45" (ชั่วโมง:นาที), "90" (นาทีเปล่า)
// หน่วย: w = 7 วัน, d = 24 ชั่วโมง (ปฏิทิน ไม่ใช่ working day ที่ตั้งค่าได้แบบ Jira จริง)

export const MAX_LOG_MINUTES = 60 * 24 * 60 // 60 วัน — กันค่าพิมพ์ผิดหลุดโลก แต่พอสำหรับ log เป็นสัปดาห์

const UNIT_MINUTES: Record<string, number> = {
  w: 7 * 24 * 60,
  d: 24 * 60,
  h: 60,
  m: 1,
}

export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase()
  if (!s) return null

  // รูปแบบ H:MM หรือ H:MM:SS
  const clock = s.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/)
  if (clock) {
    const minutes = Number(clock[1]) * 60 + Number(clock[2])
    return validMinutes(minutes)
  }

  // ตัวเลขเปล่า = นาที
  if (/^\d+$/.test(s)) {
    return validMinutes(Number(s))
  }

  // คู่ <ตัวเลข><หน่วย w/d/h/m> เรียงกันได้ เช่น "2w 4d 6h 45m", "1h 45m", "30m 1h"
  const compact = s.replace(/\s+/g, '')
  const pairs = /^(?:\d+[wdhm])+$/.test(compact)
  if (!pairs) return null

  let minutes = 0
  for (const [, n, unit] of compact.matchAll(/(\d+)([wdhm])/g)) {
    minutes += UNIT_MINUTES[unit as string]! * Number(n)
  }
  return validMinutes(minutes)
}

function validMinutes(minutes: number): number | null {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_LOG_MINUTES) {
    return null
  }
  return Math.round(minutes)
}

// แปลงนาทีกลับเป็นข้อความ "1d 2h 30m" สำหรับ preview — แสดงผลด้วย d/h/m เสมอ (ไม่ใช้ w)
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m'
  const d = Math.floor(minutes / (24 * 60))
  const h = Math.floor((minutes % (24 * 60)) / 60)
  const m = minutes % 60
  return [
    d > 0 ? `${d}d` : null,
    h > 0 ? `${h}h` : null,
    m > 0 || (d === 0 && h === 0) ? `${m}m` : null,
  ]
    .filter(Boolean)
    .join(' ')
}
