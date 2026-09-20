import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { queryKeys } from '@/lib/query-keys'
import { authClient } from '@/features/auth/auth-client'
import { EntriesTableShell } from '@/components/layout/entries-table-shell'
import { formatDuration } from '@/lib/duration'
import {
  countIssueEntries,
  getIssueMeta,
  listIssueEntries,
} from './time-entries.functions'
import type { IssueEntryRow } from './time-entries.server'

const PAGE_SIZE = 20

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Mine' },
] as const

function WorklogRow({ entry }: { entry: IssueEntryRow }) {
  return (
    <tr className="hover:bg-accent/30">
      <td className="px-4 py-3 tabular-nums">{entry.workDate}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {entry.userName ?? '—'}
      </td>
      <td className="px-4 py-3 tabular-nums">
        {formatDuration(entry.durationMinutes)}
      </td>
      <td className="max-w-72 truncate px-4 py-3 text-muted-foreground">
        {entry.note || '—'}
      </td>
      <td className="px-4 py-3">
        {entry.running ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
            running
          </Badge>
        ) : (
          <Badge variant="secondary">logged</Badge>
        )}
      </td>
    </tr>
  )
}

function WorklogTable({
  isLoading,
  rows,
}: {
  isLoading: boolean
  rows: IssueEntryRow[]
}) {
  return (
    <EntriesTableShell
      headers={['Date', 'Member', 'Duration', 'Note', 'Status']}
      isLoading={isLoading}
      isEmpty={rows.length === 0}
      emptyText="ยังไม่มีรายการเวลาใน issue นี้"
    >
      {rows.map((e) => (
        <WorklogRow key={e.id} entry={e} />
      ))}
    </EntriesTableShell>
  )
}

export function IssueWorklogPage({ issueId }: { issueId: string }) {
  const [page, setPage] = useState(1)
  const [onlyMine, setOnlyMine] = useState(false)
  const list = useServerFn(listIssueEntries)
  const count = useServerFn(countIssueEntries)
  const metaFn = useServerFn(getIssueMeta)
  const { data: session } = authClient.useSession()
  const numericIssueId = Number(issueId)

  const userId = onlyMine ? session?.user.id : undefined

  const qMeta = useQuery({
    queryKey: queryKeys.issueMeta(numericIssueId),
    queryFn: () => metaFn({ data: { issueId: numericIssueId } }),
  })
  const qRows = useQuery({
    queryKey: queryKeys.issueEntriesPage(numericIssueId, page, userId),
    queryFn: () =>
      list({
        data: {
          issueId: numericIssueId,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          userId,
        },
      }),
    enabled: !onlyMine || !!session,
  })
  const qTotal = useQuery({
    queryKey: queryKeys.issueEntriesCount(numericIssueId, userId),
    queryFn: () => count({ data: { issueId: numericIssueId, userId } }),
    enabled: !onlyMine || !!session,
  })

  const meta = qMeta.data
  const total = qTotal.data ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function switchFilter(next: 'all' | 'mine') {
    setOnlyMine(next === 'mine')
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {meta && (
        <Link
          to="/projects/$projectId"
          params={{ projectId: String(meta.projectId) }}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Project
        </Link>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {meta ? `${meta.projectKey}-${meta.number}` : 'Work log'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {meta?.title ?? 'กำลังโหลด…'}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex w-fit rounded-lg border p-0.5 text-xs font-medium">
          {FILTERS.map(({ key, label }) => {
            const active = (key === 'mine') === onlyMine
            return (
              <button
                key={key}
                type="button"
                onClick={() => switchFilter(key)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <WorklogTable isLoading={qRows.isLoading} rows={qRows.data ?? []} />

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
