import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { FolderKanban, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '@/features/auth/auth-client'
import { queryKeys } from '@/lib/query-keys'
import { Role } from '@/lib/roles'
import {
  createProject,
  getProjects,
} from '@/features/projects/projects.functions'
import { createProjectInputSchema } from '@/features/projects/projects.schema'
import type { CreateProjectInput } from '@/features/projects/projects.schema'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

function formatMinutes(total: number) {
  const h = Math.floor(total / 60)
  return h > 0 ? `${h}h` : `${total}m`
}

export function ProjectsPage() {
  const { data: session } = authClient.useSession()
  const projects = useServerFn(getProjects)
  const q = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => projects(),
  })
  const canCreate =
    session?.user.role === Role.Admin || session?.user.role === Role.Manager

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">โปรเจกต์ทั้งหมดในระบบ</p>
        </div>
        {canCreate && <NewProjectForm />}
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {q.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        {(q.data?.projects ?? []).map((p) => (
          <Link
            key={p.id}
            to="/projects/$projectId"
            params={{ projectId: String(p.id) }}
            className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:bg-accent/40"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex size-9 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary"
                style={{ viewTransitionName: `project-key-${p.id}` }}
              >
                {p.key}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold group-hover:underline">
                  {p.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  owner: {p.ownerName ?? '—'}
                </p>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
              {p.description ?? '—'}
            </p>
            <div className="mt-4 flex gap-4 border-t pt-3 text-xs text-muted-foreground">
              <span>{p.openIssues} open issues</span>
              <span>{formatMinutes(p.totalMinutes)} logged</span>
            </div>
          </Link>
        ))}
        {q.data?.projects.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-muted-foreground">
            <FolderKanban className="size-10" />
            <p className="text-sm">ยังไม่มีโปรเจกต์</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NewProjectForm() {
  const qc = useQueryClient()
  const create = useServerFn(createProject)
  const [open, setOpen] = useState(false)

  const form = useForm<z.input<typeof createProjectInputSchema>>({
    resolver: zodResolver(createProjectInputSchema),
    defaultValues: { key: '', name: '', description: '' },
  })

  const mut = useMutation({
    mutationFn: (values: CreateProjectInput) =>
      create({
        data: {
          key: values.key,
          name: values.name,
          description: values.description || undefined,
        },
      }),
    onSuccess: () => {
      setOpen(false)
      form.reset()
      qc.invalidateQueries({ queryKey: queryKeys.projects })
      toast.success('สร้างโปรเจกต์แล้ว')
    },
    onError: (err) => {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Failed to create',
      })
      toast.error('สร้างโปรเจกต์ไม่สำเร็จ', {
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
          <Plus className="size-4" /> New project
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>New project</SheetTitle>
          <SheetDescription>สร้างโปรเจกต์ใหม่เพื่อเริ่มจัดการงาน</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id="new-project-form"
            className="flex flex-col gap-4 px-4"
            onSubmit={form.handleSubmit((values) => mut.mutate(values))}
            noValidate
          >
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="WEB"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Website Revamp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
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
                Create project
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
