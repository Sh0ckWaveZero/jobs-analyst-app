import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Download, FileChartColumn } from 'lucide-react'

import { queryKeys } from '@/lib/query-keys'
import { getWorkHourReport } from '@/features/time-entries/time-entries.functions'
import type { AnalysisRange } from '@/features/time-entries/time-entries.schema'
import type { WorkHourReport } from '@/features/time-entries/time-entries.server'
import { formatDuration } from '@/lib/duration'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const RANGES = ['5D', '2W', '1M', '6M', '1Y'] as const

type ReportRow = WorkHourReport['rows'][number]

// รวมยอดต่อคนสำหรับแถว subtotal
function groupByUser(rows: ReportRow[]) {
  const byUser = new Map<string, { userName: string; minutes: number }>()
  for (const r of rows) {
    const entry = byUser.get(r.userId)
    if (entry) entry.minutes += r.minutes
    else byUser.set(r.userId, { userName: r.userName, minutes: r.minutes })
  }
  return byUser
}

function csvCell(value: string | number) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

function buildCsv(rows: ReportRow[]) {
  const header = 'user,project_key,project_name,minutes,duration'
  const lines = rows.map((r) =>
    [
      csvCell(r.userName),
      csvCell(r.projectKey),
      csvCell(r.projectName),
      r.minutes,
      csvCell(formatDuration(r.minutes)),
    ].join(','),
  )
  // BOM ให้ Excel เปิดภาษาไทยถูกต้อง
  return `\ufeff${[header, ...lines].join('\n')}`
}

export function ReportsPage() {
  const [range, setRange] = useState<AnalysisRange>('1M')
  const reportFn = useServerFn(getWorkHourReport)
  const q = useQuery({
    queryKey: queryKeys.report(range),
    queryFn: () => reportFn({ data: { range } }),
  })

  const rows = q.data?.rows ?? []
  // dep เป็น q.data ตรง ๆ — rows มี ?? [] ทำให้ reference ใหม่ทุก render
  const perUser = useMemo(
    () => groupByUser(q.data?.rows ?? []),
    [q.data],
  )

  function exportCsv() {
    if (!q.data || rows.length === 0) return
    const blob = new Blob([buildCsv(rows)], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `work-hours-${q.data.range}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Work Hour Analysis ต่อคนและต่อโปรเจกต์ (ตามสิทธิ์การมองเห็นของคุณ)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={!q.data || rows.length === 0}
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-lg border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="text-sm font-semibold tabular-nums">
          {q.data ? `รวม ${formatDuration(q.data.totalMinutes)}` : '…'}
        </p>
      </div>

      <section className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        {q.isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <FileChartColumn className="size-10" />
            <p className="text-sm">
              ยังไม่มีข้อมูลเวลาในช่วงนี้ — เริ่มบันทึกเวลาก่อนแล้วกลับมาดูรายงาน
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">คน</th>
                <th className="px-4 py-3 font-medium">โปรเจกต์</th>
                <th className="px-4 py-3 text-right font-medium">เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr
                  key={`${r.userId}-${r.projectKey}`}
                  className="hover:bg-accent/30"
                >
                  <td className="px-4 py-3 font-medium">{r.userName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="mr-2 font-mono text-xs">
                      {r.projectKey}
                    </span>
                    {r.projectName}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatDuration(r.minutes)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/40">
              {[...perUser.entries()].map(([userId, u]) => (
                <tr key={userId}>
                  <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    รวม {u.userName}
                  </td>
                  <td />
                  <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums">
                    {formatDuration(u.minutes)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2.5 text-xs font-semibold">ทั้งหมด</td>
                <td />
                <td className="px-4 py-2.5 text-right text-xs font-bold tabular-nums">
                  {q.data ? formatDuration(q.data.totalMinutes) : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  )
}
