import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Clock, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query-keys'
import { Role } from '@/lib/roles'
import { authClient } from '@/features/auth/auth-client'
import { DatePicker } from '@/components/ui/date-picker'
import {
  deleteEntry,
  listIssueEntries,
  updateEntry,
} from '@/features/time-entries/time-entries.functions'
import type { IssueEntryRow } from '@/features/time-entries/time-entries.server'
import { formatDuration, parseDuration } from '@/lib/duration'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function IssueWorklogDrawer({
  issue,
  totalMinutes,
}: {
  issue: { id: number; key: string; title: string; projectId: number }
  totalMinutes: number
}) {
  const { data: session } = authClient.useSession()
  const qc = useQueryClient()
  const entriesFn = useServerFn(listIssueEntries)
  const update = useServerFn(updateEntry)
  const del = useServerFn(deleteEntry)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [onlyMine, setOnlyMine] = useState(false)

  const q = useQuery({
    queryKey: queryKeys.issueEntries(issue.id),
    queryFn: () => entriesFn({ data: { issueId: issue.id } }),
    enabled: open,
  })

  const delMut = useMutation({
    mutationFn: (id: number) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.root })
      toast.success('ลบรายการเวลาแล้ว')
    },
    onError: (err) =>
      toast.error('ลบรายการไม่สำเร็จ', {
        description: err instanceof Error ? err.message : undefined,
      }),
  })

  const updateMut = useMutation({
    mutationFn: (input: {
      id: number
      minutes: number
      workDate: string
      note: string | null
    }) => update({ data: input }),
    onSuccess: () => {
      setEditingId(null)
      qc.invalidateQueries({ queryKey: queryKeys.root })
      toast.success('แก้ไขรายการเวลาแล้ว')
    },
    onError: (err) =>
      toast.error('แก้ไขรายการไม่สำเร็จ', {
        description: err instanceof Error ? err.message : undefined,
      }),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setEditingId(null)
  }

  const filteredEntries = (q.data ?? []).filter(
    (entry) => !onlyMine || entry.userId === session?.user.id,
  )
  const visibleEntries = filteredEntries.slice(0, 5)

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs tabular-nums text-muted-foreground hover:text-foreground"
              aria-label="View work log"
            >
              <Clock className="size-3.5" />
              {formatDuration(totalMinutes)}
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>View work log</TooltipContent>
      </Tooltip>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>Work log</SheetTitle>
          <SheetDescription>
            {issue.key} · {issue.title}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-6">
          <div className="flex w-fit rounded-lg border p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setOnlyMine(false)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                !onlyMine
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setOnlyMine(true)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                onlyMine
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mine
            </button>
          </div>

          {q.isLoading && <Skeleton className="h-16 w-full rounded-lg" />}

          {visibleEntries.map((entry) =>
            entry.id === editingId ? (
              <EditEntryForm
                key={entry.id}
                entry={entry}
                pending={updateMut.isPending}
                onSave={(values) => updateMut.mutate({ id: entry.id, ...values })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium tabular-nums">
                      {formatDuration(entry.durationMinutes)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.workDate} · {entry.userName ?? '—'}
                    </span>
                    {entry.running && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                        running
                      </Badge>
                    )}
                  </div>
                  {entry.note && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {entry.note}
                    </p>
                  )}
                </div>
                {canEditEntry(session?.user.id, session?.user.role, entry) && (
                  <div className="flex shrink-0 gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingId(entry.id)}
                          aria-label="Edit entry"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit entry</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => delMut.mutate(entry.id)}
                          disabled={delMut.isPending}
                          aria-label="Delete entry"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete entry</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            ),
          )}

          {filteredEntries.length > 5 && (
            <Link
              to="/issues/$issueId"
              params={{ issueId: String(issue.id) }}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all ({filteredEntries.length} entries)
            </Link>
          )}

          {!q.isLoading && filteredEntries.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {onlyMine
                ? 'คุณยังไม่มีรายการเวลาใน issue นี้'
                : 'ยังไม่มีรายการเวลาใน issue นี้'}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function canEditEntry(
  userId: string | null | undefined,
  role: string | null | undefined,
  entry: IssueEntryRow,
) {
  return role === Role.Admin || (userId != null && userId === entry.userId)
}

function EditEntryForm({
  entry,
  pending,
  onSave,
  onCancel,
}: {
  entry: IssueEntryRow
  pending: boolean
  onSave: (values: {
    minutes: number
    workDate: string
    note: string | null
  }) => void
  onCancel: () => void
}) {
  const [timeSpent, setTimeSpent] = useState(() =>
    formatDuration(entry.durationMinutes),
  )
  const [workDate, setWorkDate] = useState(entry.workDate)
  const [note, setNote] = useState(entry.note ?? '')
  const [error, setError] = useState<string | null>(null)

  const minutes = parseDuration(timeSpent)

  function submit() {
    if (minutes === null) {
      setError('รูปแบบไม่ถูกต้อง เช่น 1h 45m, 1:45 หรือ 90 (นาที)')
      return
    }
    onSave({ minutes, workDate, note: note.trim() ? note.trim() : null })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs">
          Time spent
          <Input
            value={timeSpent}
            onChange={(e) => {
              setTimeSpent(e.target.value)
              setError(null)
            }}
            placeholder="1h 45m"
            className="h-8 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Work date
          <DatePicker value={workDate} onChange={setWorkDate} className="h-8 text-sm" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        Note
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="อะไรที่ทำในช่วงเวลานี้"
          className="h-8 text-sm"
        />
      </label>
      {timeSpent.trim() !== '' && minutes !== null && (
        <p className="text-xs text-muted-foreground">
          = {formatDuration(minutes)} ({minutes} นาที)
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
