import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CalendarDays,
  CircleDot,
  Clock,
  ListTodo,
  Pause,
  Play,
} from 'lucide-react'

import { authClient } from '@/features/auth/auth-client'
import {
  getDashboardCounts,
  listIssues,
} from '@/features/issues/issues.functions'
import {
  getMyWeekMinutes,
  getRunningEntry,
  getWorkHourAnalysis,
  listMyEntries,
  startTimer,
  stopTimer,
} from '@/features/time-entries/time-entries.functions'
import type { AnalysisRange } from '@/features/time-entries/time-entries.schema'
import { getProjects } from '@/features/projects/projects.functions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { IssueStatus } from '@/db/schema'

const RANGES = ['5D', '2W', '1M', '6M', '1Y'] as const

const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

function formatMinutes(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} mins`
  return `${h} hours · ${m} mins`
}

export function DashboardPage() {
  const { data: session } = authClient.useSession()

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          ภาพรวมงานและชั่วโมงทำงาน
          {session?.user ? ` · ${session.user.name}` : ''}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCards />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <IssueStatusCard />
        <WorkHourCard />
      </div>

      <TimeTrackerCard />

      <div className="grid gap-4 lg:grid-cols-5">
        <MyIssuesCard />
        <MeetingsCard />
      </div>

      <RecentEntriesCard />
    </div>
  )
}

function Card({
  title,
  note,
  children,
  className,
}: {
  title: string
  note?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className ?? ''}`}
    >
      <div className="flex items-baseline justify-between border-b px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function StatCards() {
  const counts = useServerFn(getDashboardCounts)
  const week = useServerFn(getMyWeekMinutes)
  const qCounts = useQuery({
    queryKey: ['pm', 'counts'],
    queryFn: () => counts(),
  })
  const qWeek = useQuery({
    queryKey: ['pm', 'week'],
    queryFn: () => week(),
  })

  const items = [
    { label: 'Issues created', value: qCounts.data?.created, icon: CircleDot },
    {
      label: 'Issues assigned',
      value: qCounts.data?.assigned,
      icon: ListTodo,
    },
    {
      label: 'Hours this week',
      value: qWeek.data != null ? formatMinutes(qWeek.data) : undefined,
      icon: Clock,
    },
  ]

  return (
    <>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <item.icon className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">
            {item.value ?? <Skeleton className="h-8 w-16" />}
          </div>
        </div>
      ))}
    </>
  )
}

function IssueStatusCard() {
  const counts = useServerFn(getDashboardCounts)
  const q = useQuery({ queryKey: ['pm', 'counts'], queryFn: () => counts() })
  const statusCounts = q.data?.statusCounts
  const max = Math.max(1, ...Object.values(statusCounts ?? { done: 1 }))

  return (
    <Card title="Issue Status" note="assigned to me" className="lg:col-span-2">
      {statusCounts ? (
        <ul className="flex flex-col gap-3">
          {(Object.keys(STATUS_LABELS) as IssueStatus[]).map((status) => (
            <li key={status} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-muted-foreground">
                {STATUS_LABELS[status]}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{
                    width: `${((statusCounts[status] ?? 0) / max) * 100}%`,
                  }}
                />
              </div>
              <span className="w-8 text-right font-medium tabular-nums">
                {statusCounts[status] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      )}
    </Card>
  )
}

function WorkHourCard() {
  const [range, setRange] = useState<AnalysisRange>('2W')
  const analysis = useServerFn(getWorkHourAnalysis)
  const q = useQuery({
    queryKey: ['pm', 'analysis', range],
    queryFn: () => analysis({ data: { range } }),
  })

  const chartData = useMemo(
    () =>
      q.data?.series.map((s) => ({
        date: s.date.slice(5),
        hours: Math.round((s.minutes / 60) * 10) / 10,
      })) ?? [],
    [q.data],
  )

  return (
    <Card
      title="Work Hour Analysis"
      note="includes extra hours"
      className="lg:col-span-3"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {q.data ? formatMinutes(q.data.totalMinutes) : '—'}
          </p>
          <p className="text-xs text-muted-foreground">total in range</p>
        </div>
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
      </div>
      <div className="h-48">
        {q.data ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                width={28}
                unit="h"
              />
              <ChartTooltip formatter={(v) => [`${v}h`, 'Work']} />
              <Bar
                dataKey="hours"
                fill="hsl(var(--primary))"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Skeleton className="h-full w-full" />
        )}
      </div>
    </Card>
  )
}

const trackerFormSchema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  issueId: z.string(),
  note: z.string().max(300),
})

type TrackerFormValues = z.infer<typeof trackerFormSchema>

function TimeTrackerCard() {
  const qc = useQueryClient()
  const running = useServerFn(getRunningEntry)
  const start = useServerFn(startTimer)
  const stop = useServerFn(stopTimer)
  const projects = useServerFn(getProjects)
  const listIssuesFn = useServerFn(listIssues)

  const qRunning = useQuery({
    queryKey: ['pm', 'running'],
    queryFn: () => running(),
  })
  const qProjects = useQuery({
    queryKey: ['pm', 'projects'],
    queryFn: () => projects(),
  })

  const form = useForm<TrackerFormValues>({
    resolver: zodResolver(trackerFormSchema),
    defaultValues: { projectId: '', issueId: '', note: '' },
  })
  const projectId = form.watch('projectId')

  const qIssues = useQuery({
    queryKey: ['pm', 'project-issues', projectId],
    queryFn: () =>
      listIssuesFn({ data: { projectId: Number(projectId), limit: 50 } }),
    enabled: projectId !== '',
  })

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!qRunning.data) return
    const started = new Date(qRunning.data.startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [qRunning.data])

  const startMut = useMutation({
    mutationFn: (values: TrackerFormValues) =>
      start({
        data: {
          projectId: Number(values.projectId),
          issueId: values.issueId ? Number(values.issueId) : undefined,
          note: values.note || undefined,
        },
      }),
    onSuccess: (_data, variables) => {
      form.reset({ projectId: variables.projectId, issueId: '', note: '' })
      qc.invalidateQueries({ queryKey: ['pm'] })
    },
  })
  const stopMut = useMutation({
    mutationFn: () => {
      const id = qRunning.data?.id
      if (!id) throw new Error('No running timer')
      return stop({ data: { entryId: id } })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm'] }),
  })

  const hhmmss = (s: number) =>
    [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
      .map((n) => String(n).padStart(2, '0'))
      .join(':')

  return (
    <Card title="Time Tracker" note="log hours as you work">
      {qRunning.data ? (
        <div className="flex flex-wrap items-center gap-4">
          <div className="font-mono text-3xl font-semibold tabular-nums">
            {hhmmss(elapsed)}
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">
              {qRunning.data.projectKey}
              {qRunning.data.issueNumber
                ? `-${qRunning.data.issueNumber}`
                : ''}{' '}
              {qRunning.data.issueTitle ?? qRunning.data.note ?? 'Working…'}
            </p>
            <p className="text-xs text-muted-foreground">
              started at{' '}
              {new Date(qRunning.data.startedAt).toLocaleTimeString()}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => stopMut.mutate()}
            disabled={stopMut.isPending}
          >
            <Pause className="size-4" /> Stop
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={form.handleSubmit((values) => startMut.mutate(values))}
            noValidate
          >
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem className="flex min-w-40 flex-1 flex-col gap-1.5 text-sm">
                  <FormLabel className="text-xs text-muted-foreground">
                    Project
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      form.setValue('issueId', '')
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select project…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {qProjects.data?.projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.key} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="issueId"
              render={({ field }) => (
                <FormItem className="flex min-w-40 flex-1 flex-col gap-1.5 text-sm">
                  <FormLabel className="text-xs text-muted-foreground">
                    Issue (optional)
                  </FormLabel>
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                    disabled={!projectId}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No issue" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No issue</SelectItem>
                      {qIssues.data?.map((i) => (
                        <SelectItem key={i.id} value={String(i.id)}>
                          {i.key} {i.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="flex min-w-40 flex-1 flex-col gap-1.5 text-sm">
                  <FormLabel className="text-xs text-muted-foreground">
                    Note (optional)
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="What are you working on?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={startMut.isPending || !projectId}>
              <Play className="size-4" /> Start
            </Button>
          </form>
        </Form>
      )}
      {startMut.isError && (
        <p className="mt-3 text-sm text-destructive">
          {startMut.error instanceof Error
            ? startMut.error.message
            : 'Failed to start'}
        </p>
      )}
    </Card>
  )
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
}

function MyIssuesCard() {
  const listIssuesFn = useServerFn(listIssues)
  const { data: session } = authClient.useSession()
  const q = useQuery({
    queryKey: ['pm', 'issues', 'mine'],
    queryFn: () =>
      listIssuesFn({ data: { assigneeId: session!.user.id, limit: 8 } }),
    enabled: !!session,
  })

  return (
    <Card title="My Issues" note="assigned to me" className="lg:col-span-3">
      <ul className="flex flex-col divide-y">
        {(q.data ?? []).map((issue) => (
          <li key={issue.id} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
              {issue.key}
            </span>
            <span className="min-w-0 flex-1 truncate">{issue.title}</span>
            <Badge variant="outline" className="shrink-0">
              {STATUS_LABELS[issue.status]}
            </Badge>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[issue.priority]}`}
            >
              {issue.priority}
            </span>
          </li>
        ))}
        {q.data?.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            ไม่มี issue ที่มอบหมายให้คุณ
          </li>
        )}
      </ul>
    </Card>
  )
}

function MeetingsCard() {
  // placeholder v1 — ยังไม่มี calendar integration
  const [tab, setTab] = useState<'meetings' | 'events' | 'focus'>('meetings')
  const meetings = [
    {
      time: '09:00 – 09:45',
      title: 'Timeline planning review',
      place: 'Google Meet',
      label: 'Roadmap',
    },
    {
      time: '11:30 – 12:00',
      title: 'Design handoff sync',
      place: 'Zoom',
      label: 'Design',
    },
    {
      time: '15:00 – 15:30',
      title: 'Release readiness check',
      place: 'Slack huddle',
      label: 'Launch',
    },
  ]

  return (
    <Card title="Today" className="lg:col-span-2">
      <div className="mb-4 flex rounded-lg border p-0.5 text-xs font-medium">
        {(['meetings', 'events', 'focus'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-2 py-1 capitalize transition-colors ${
              tab === t
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'meetings' ? (
        <ul className="flex flex-col gap-3">
          {meetings.map((m) => (
            <li
              key={m.title}
              className="flex items-start gap-3 rounded-lg border p-3 text-sm"
            >
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {m.time} · {m.place}
                </p>
              </div>
              <Badge variant="secondary">{m.label}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {tab === 'events'
            ? 'ยังไม่มี events — จะเชื่อม calendar ในเวอร์ชันถัดไป'
            : 'ตั้ง focus time เพื่อบล็อกช่วงทำงานสมาธิ (เร็ว ๆ นี้)'}
        </p>
      )}
    </Card>
  )
}

function RecentEntriesCard() {
  const entries = useServerFn(listMyEntries)
  const q = useQuery({
    queryKey: ['pm', 'my-entries'],
    queryFn: () => entries({ data: {} }),
  })

  return (
    <Card title="Recent Time Entries" note="latest 20 of mine">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Issue</th>
              <th className="pb-2 font-medium">Duration</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(q.data ?? []).map((e) => (
              <tr key={e.id}>
                <td className="py-2.5 tabular-nums">{e.workDate}</td>
                <td className="py-2.5">
                  <span className="font-mono text-xs text-muted-foreground">
                    {e.projectKey}
                    {e.issueNumber ? `-${e.issueNumber}` : ''}
                  </span>{' '}
                  {e.issueTitle ?? '—'}
                </td>
                <td className="py-2.5 tabular-nums">
                  {formatMinutes(e.durationMinutes)}
                </td>
                <td className="py-2.5">
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
            {q.data?.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-muted-foreground"
                >
                  ยังไม่มีรายการ — เริ่มจับเวลาด้านบนได้เลย
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
