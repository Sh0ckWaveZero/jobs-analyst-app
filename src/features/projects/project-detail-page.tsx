import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { IssueRow } from '@/features/issues/issues.server'
import { LogWorkDrawer } from '@/features/time-entries/log-work-drawer'
import { IssueWorklogDrawer } from '@/features/time-entries/issue-worklog-drawer'

import { authClient } from '@/features/auth/auth-client'
import {
  createIssue,
  deleteIssue,
  listIssues,
  updateIssue,
} from '@/features/issues/issues.functions'
import { getProjects } from '@/features/projects/projects.functions'
import { getAssignableUsers } from '@/features/users/users.functions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { IssueStatus } from '@/db/schema'

const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
}

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const pid = Number(projectId)
  const { data: session } = authClient.useSession()
  const projects = useServerFn(getProjects)
  const listIssuesFn = useServerFn(listIssues)

  const qProject = useQuery({
    queryKey: ['pm', 'projects'],
    queryFn: () => projects(),
  })
  const project = qProject.data?.projects.find((p) => p.id === pid)

  const qIssues = useQuery({
    queryKey: ['pm', 'project-issues', pid],
    queryFn: () => listIssuesFn({ data: { projectId: pid, limit: 100 } }),
  })

  const canManage =
    session?.user.role === 'admin' ||
    (session?.user.role === 'manager' &&
      qProject.data?.projects.find((p) => p.id === pid)?.ownerId ===
        session.user.id)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Projects
        </Link>
        <header className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
              {project?.key ?? '…'}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {project?.name ?? <Skeleton className="h-8 w-48" />}
              </h1>
              <p className="text-sm text-muted-foreground">
                {project?.description ?? ''}
              </p>
            </div>
          </div>
          {(canManage || session?.user.role === 'member') && (
            <NewIssueForm projectId={pid} />
          )}
        </header>
      </div>

      <section className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Issue</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Labels</th>
              <th className="px-4 py-3 font-medium">Due date</th>
              <th className="px-4 py-3 font-medium">Logged</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {(qIssues.data ?? []).map((issue) => (
              <tr key={issue.id} className="hover:bg-accent/30">
                <td className="px-4 py-3">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">
                    {issue.key}
                  </span>
                  <span className="font-medium">{issue.title}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusSelect
                    issueId={issue.id}
                    value={issue.status}
                    disabled={
                      !canManage &&
                      session?.user.id !== issue.reporterId &&
                      session?.user.id !== issue.assigneeId
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[issue.priority]}`}
                  >
                    {issue.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {issue.assigneeName ?? 'No owner'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {issue.labels.map((l) => (
                      <Badge key={l} variant="secondary">
                        {l}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {issue.dueDate ?? '—'}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {issue.totalMinutes > 0 ? (
                    <IssueWorklogDrawer
                      issue={issue}
                      totalMinutes={issue.totalMinutes}
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {(canManage ||
                    session?.user.id === issue.reporterId ||
                    session?.user.id === issue.assigneeId) && (
                    <>
                      <LogWorkDrawer projectId={pid} issue={issue} />
                      <EditIssueDrawer issue={issue} />
                    </>
                  )}
                  {canManage && <DeleteIssueButton issueId={issue.id} />}
                </td>
              </tr>
            ))}
            {qIssues.data?.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  ยังไม่มี issue ในโปรเจกต์นี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function StatusSelect({
  issueId,
  value,
  disabled,
}: {
  issueId: number
  value: IssueStatus
  disabled?: boolean
}) {
  const qc = useQueryClient()
  const update = useServerFn(updateIssue)
  const mut = useMutation({
    mutationFn: (status: IssueStatus) =>
      update({ data: { id: issueId, status } }),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ['pm'] })
      toast.success(`อัปเดตสถานะเป็น ${STATUS_LABELS[status]} แล้ว`)
    },
    onError: (err) =>
      toast.error('เปลี่ยนสถานะไม่สำเร็จ', {
        description: err instanceof Error ? err.message : undefined,
      }),
  })

  return (
    <Select
      value={value}
      disabled={disabled || mut.isPending}
      onValueChange={(v) => mut.mutate(v as IssueStatus)}
    >
      <SelectTrigger className="h-7 w-32 px-2 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(STATUS_LABELS) as IssueStatus[]).map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DeleteIssueButton({ issueId }: { issueId: number }) {
  const qc = useQueryClient()
  const del = useServerFn(deleteIssue)
  const mut = useMutation({
    mutationFn: () => del({ data: { id: issueId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm'] })
      toast.success('ลบ issue แล้ว')
    },
    onError: (err) =>
      toast.error('ลบ issue ไม่สำเร็จ', {
        description: err instanceof Error ? err.message : undefined,
      }),
  })

  return (
    <button
      type="button"
      onClick={() => mut.mutate()}
      disabled={mut.isPending}
      className="text-xs text-muted-foreground hover:text-destructive"
    >
      delete
    </button>
  )
}

const issueFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  priority: z.enum(['low', 'medium', 'high']),
  assigneeId: z.string(),
  dueDate: z.string(),
  labels: z.string().max(200),
})

type IssueFormValues = z.infer<typeof issueFormSchema>

function NewIssueForm({ projectId }: { projectId: number }) {
  const qc = useQueryClient()
  const create = useServerFn(createIssue)
  const assignable = useServerFn(getAssignableUsers)
  const [open, setOpen] = useState(false)

  const qAssignable = useQuery({
    queryKey: ['pm', 'assignable'],
    queryFn: () => assignable(),
  })

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      title: '',
      priority: 'medium',
      assigneeId: 'none',
      dueDate: '',
      labels: '',
    },
  })

  const mut = useMutation({
    mutationFn: (values: IssueFormValues) =>
      create({
        data: {
          projectId,
          title: values.title,
          priority: values.priority,
          assigneeId:
            values.assigneeId && values.assigneeId !== 'none'
              ? values.assigneeId
              : undefined,
          dueDate: values.dueDate || undefined,
          labels: values.labels
            ? values.labels
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
        },
      }),
    onSuccess: () => {
      setOpen(false)
      form.reset()
      qc.invalidateQueries({ queryKey: ['pm'] })
      toast.success('สร้าง issue แล้ว')
    },
    onError: (err) => {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Failed to create',
      })
      toast.error('สร้าง issue ไม่สำเร็จ', {
        description: err instanceof Error ? err.message : undefined,
      })
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) form.reset()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="size-4" /> New issue
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New issue</SheetTitle>
          <SheetDescription>สร้าง issue ใหม่ในโปรเจกต์นี้</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4 px-4"
            onSubmit={form.handleSubmit((values) => mut.mutate(values))}
            noValidate
          >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="What needs to be done?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assigneeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignee</FormLabel>
              <Select
                value={field.value || 'none'}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(qAssignable.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
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
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="labels"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Labels (comma)</FormLabel>
              <FormControl>
                <Input placeholder="frontend, api" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <div className="flex gap-2 pb-4">
              <Button type="submit" disabled={mut.isPending}>
                Create issue
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

const editIssueFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  assigneeId: z.string(),
  dueDate: z.string(),
  labels: z.string().max(200),
})

type EditIssueFormValues = z.infer<typeof editIssueFormSchema>

function EditIssueDrawer({ issue }: { issue: IssueRow }) {
  const qc = useQueryClient()
  const update = useServerFn(updateIssue)
  const assignable = useServerFn(getAssignableUsers)
  const [open, setOpen] = useState(false)

  const qAssignable = useQuery({
    queryKey: ['pm', 'assignable'],
    queryFn: () => assignable(),
    enabled: open,
  })

  const form = useForm<EditIssueFormValues>({
    resolver: zodResolver(editIssueFormSchema),
    defaultValues: {
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      assigneeId: issue.assigneeId ?? 'none',
      dueDate: issue.dueDate ?? '',
      labels: issue.labels.join(', '),
    },
  })

  const mut = useMutation({
    mutationFn: (values: EditIssueFormValues) =>
      update({
        data: {
          id: issue.id,
          title: values.title,
          status: values.status,
          priority: values.priority,
          assigneeId:
            values.assigneeId && values.assigneeId !== 'none'
              ? values.assigneeId
              : null,
          dueDate: values.dueDate || null,
          labels: values.labels
            ? values.labels
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        },
      }),
    onSuccess: () => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['pm'] })
      toast.success('บันทึกการแก้ไข issue แล้ว')
    },
    onError: (err) => {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Failed to update',
      })
      toast.error('แก้ไข issue ไม่สำเร็จ', {
        description: err instanceof Error ? err.message : undefined,
      })
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      form.reset({
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        assigneeId: issue.assigneeId ?? 'none',
        dueDate: issue.dueDate ?? '',
        labels: issue.labels.join(', '),
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          Edit
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit issue</SheetTitle>
          <SheetDescription>
            {issue.key} · {issue.projectName}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4 px-4"
            onSubmit={form.handleSubmit((values) => mut.mutate(values))}
            noValidate
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="What needs to be done?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(STATUS_LABELS) as IssueStatus[]).map(
                        (s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">low</SelectItem>
                      <SelectItem value="medium">medium</SelectItem>
                      <SelectItem value="high">high</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <Select
                    value={field.value || 'none'}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {(qAssignable.data ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
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
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="labels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Labels (comma)</FormLabel>
                  <FormControl>
                    <Input placeholder="frontend, api" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <div className="flex gap-2 pb-4">
              <Button type="submit" disabled={mut.isPending}>
                Save changes
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
