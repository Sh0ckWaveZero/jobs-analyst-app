// ตัวช่วยแปลงข้อความเวลาแบบสั้น (Jira-style) เป็นนาที
// รองรับ: "1h 45m", "1h45m", "45m", "2h", "1:45" (ชั่วโมง:นาที), "90" (นาทีเปล่า)

export const MAX_LOG_MINUTES = 1440 // 24 ชั่วโมงต่อรายการ

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

  // คู่ <ตัวเลข><หน่วย h/m> เรียงกันได้ เช่น "1h 45m", "30m 1h"
  const compact = s.replace(/\s+/g, '')
  const pairs = /^(?:\d+[hm])+$/.test(compact)
  if (!pairs) return null

  let minutes = 0
  for (const [, n, unit] of compact.matchAll(/(\d+)([hm])/g)) {
    minutes += unit === 'h' ? Number(n) * 60 : Number(n)
  }
  return validMinutes(minutes)
}

function validMinutes(minutes: number): number | null {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_LOG_MINUTES) {
    return null
  }
  return Math.round(minutes)
}

// แปลงนาทีกลับเป็นข้อความ "1h 45m" สำหรับ preview
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h > 0 ? `${h}h` : null, m > 0 || h === 0 ? `${m}m` : null]
    .filter(Boolean)
    .join(' ')
}
