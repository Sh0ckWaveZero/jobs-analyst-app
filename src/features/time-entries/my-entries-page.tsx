import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'

import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { formatDuration } from '@/lib/duration'
import { queryKeys } from '@/lib/query-keys'
import { EntriesTableShell } from '@/components/layout/entries-table-shell'
import { countMyEntries, listMyEntries } from './time-entries.functions'

const PAGE_SIZE = 20

export function MyEntriesPage() {
  const [page, setPage] = useState(1)
  const list = useServerFn(listMyEntries)
  const count = useServerFn(countMyEntries)

  const qRows = useQuery({
    queryKey: queryKeys.myEntriesPage(page),
    queryFn: () =>
      list({ data: { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE } }),
  })
  const qTotal = useQuery({
    queryKey: queryKeys.myEntriesCount,
    queryFn: () => count(),
  })

  const rows = qRows.data ?? []
  const total = qTotal.data ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          My Time Entries
        </h1>
        <p className="text-sm text-muted-foreground">
          รายการบันทึกเวลาทั้งหมดของคุณ
        </p>
      </div>

      <EntriesTableShell
        headers={['Date', 'Issue', 'Duration', 'Status']}
        isLoading={qRows.isLoading}
        isEmpty={rows.length === 0}
        emptyText="ยังไม่มีรายการเวลา"
      >
        {rows.map((e) => (
          <tr key={e.id} className="hover:bg-accent/30">
            <td className="px-4 py-3 tabular-nums">{e.workDate}</td>
            <td className="px-4 py-3">
              <span className="mr-2 font-mono text-xs text-muted-foreground">
                {e.projectKey}
                {e.issueNumber ? `-${e.issueNumber}` : ''}
              </span>
              {e.issueTitle ?? '—'}
            </td>
            <td className="px-4 py-3 tabular-nums">
              {formatDuration(e.durationMinutes)}
            </td>
            <td className="px-4 py-3">
              {e.running ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                  running
                </Badge>
              ) : (
                <Badge variant="secondary">logged</Badge>
              )}
            </td>
          </tr>
        ))}
      </EntriesTableShell>

      <Pagination
        page={page}
        totalPages={totalPages}
        isPending={qRows.isPending}
        onPageChange={setPage}
        showFirstLast={false}
        showButtonLabels
        summary={
          <p className="text-sm text-muted-foreground tabular-nums">
            {total > 0
              ? `หน้า ${page} จาก ${totalPages} · ${total} รายการ`
              : '—'}
          </p>
        }
      />
    </div>
  )
}
