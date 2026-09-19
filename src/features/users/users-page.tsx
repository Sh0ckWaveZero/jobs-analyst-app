import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ShieldCheck, Users as UsersIcon } from 'lucide-react'

import { authClient } from '@/features/auth/auth-client'
import {
  createDepartment,
  createUser,
  listDepartments,
  listUsers,
  updateUser,
} from '@/features/users/users.functions'
import {
  createDepartmentInputSchema,
  createUserInputSchema,
} from '@/features/users/users.schema'
import type { Role } from '@/db/schema'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const ROLES: Role[] = ['admin', 'manager', 'member']

const newUserFormSchema = createUserInputSchema.extend({
  // ฟอร์มรับ department เป็น string ('' = ไม่สังกัด) แล้วแปลงตอน submit
  departmentId: z.string(),
})

type NewUserFormValues = z.input<typeof newUserFormSchema>

export function UsersPage() {
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user.role === 'admin'

  if (session && !isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-2 text-sm text-destructive">
          Forbidden — หน้านี้สำหรับ admin เท่านั้น
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          จัดการผู้ใช้ บทบาท และแผนก
        </p>
      </header>

      <NewUserForm />

      <UsersTable />
      <DepartmentsCard />
    </div>
  )
}

function NewUserForm() {
  const qc = useQueryClient()
  const create = useServerFn(createUser)
  const departmentsFn = useServerFn(listDepartments)
  const [open, setOpen] = useState(false)

  const qDepartments = useQuery({
    queryKey: ['pm', 'departments'],
    queryFn: () => departmentsFn(),
  })

  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'member',
      departmentId: '',
    },
  })

  const mut = useMutation({
    mutationFn: (values: NewUserFormValues) =>
      create({
        data: {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
          departmentId: values.departmentId
            ? Number(values.departmentId)
            : null,
        },
      }),
    onSuccess: () => {
      setOpen(false)
      form.reset()
      qc.invalidateQueries({ queryKey: ['pm'] })
    },
    onError: (err) =>
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Failed to create',
      }),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) form.reset()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button className="self-start">
          <Plus className="size-4" /> New user
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New user</SheetTitle>
          <SheetDescription>สร้างบัญชีผู้ใช้ใหม่และกำหนดสิทธิ์</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4 px-4"
            onSubmit={form.handleSubmit((values) => mut.mutate(values))}
            noValidate
          >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Somchai Admin" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
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
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select
                value={field.value || 'none'}
                onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(qDepartments.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                Create user
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

function UsersTable() {
  const users = useServerFn(listUsers)
  const departmentsFn = useServerFn(listDepartments)
  const q = useQuery({ queryKey: ['pm', 'users'], queryFn: () => users() })
  const qDepartments = useQuery({
    queryKey: ['pm', 'departments'],
    queryFn: () => departmentsFn(),
  })

  return (
    <section className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Department</th>
            <th className="px-4 py-3 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(q.data ?? []).map((u) => (
            <UserRow
              key={u.id}
              user={u}
              departments={qDepartments.data ?? []}
            />
          ))}
          {q.isLoading && (
            <tr>
              <td colSpan={5} className="px-4 py-4">
                <Skeleton className="h-6 w-full" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

function UserRow({
  user: u,
  departments: depts,
}: {
  user: {
    id: string
    name: string
    email: string
    role: string
    departmentId: number | null
    departmentName: string | null
    createdAt: Date
  }
  departments: Array<{ id: number; name: string }>
}) {
  const qc = useQueryClient()
  const update = useServerFn(updateUser)

  const mut = useMutation({
    mutationFn: (patch: { role?: Role; departmentId?: number | null }) =>
      update({ data: { id: u.id, ...patch } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm'] }),
  })

  return (
    <tr className="hover:bg-accent/30">
      <td className="px-4 py-3 font-medium">{u.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
      <td className="px-4 py-3">
        <Select
          value={u.role}
          onValueChange={(v) => mut.mutate({ role: v as Role })}
          disabled={mut.isPending}
        >
          <SelectTrigger className="h-7 w-28 px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Select
          value={u.departmentId ? String(u.departmentId) : 'none'}
          onValueChange={(v) =>
            mut.mutate({ departmentId: v === 'none' ? null : Number(v) })
          }
          disabled={mut.isPending}
        >
          <SelectTrigger className="h-7 w-36 px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {depts.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {new Date(u.createdAt).toLocaleDateString()}
      </td>
    </tr>
  )
}

function DepartmentsCard() {
  const qc = useQueryClient()
  const create = useServerFn(createDepartment)
  const departmentsFn = useServerFn(listDepartments)
  const q = useQuery({
    queryKey: ['pm', 'departments'],
    queryFn: () => departmentsFn(),
  })

  const form = useForm<z.input<typeof createDepartmentInputSchema>>({
    resolver: zodResolver(createDepartmentInputSchema),
    defaultValues: { name: '' },
  })

  const mut = useMutation({
    mutationFn: (values: z.input<typeof createDepartmentInputSchema>) =>
      create({ data: values }),
    onSuccess: () => {
      form.reset()
      qc.invalidateQueries({ queryKey: ['pm', 'departments'] })
    },
    onError: (err) =>
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Failed to create',
      }),
  })

  return (
    <section className="max-w-xl rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <ShieldCheck className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Departments</h2>
      </div>
      <div className="p-5">
        <Form {...form}>
          <form
            className="flex items-end gap-2"
            onSubmit={form.handleSubmit((values) => mut.mutate(values))}
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only">Department name</FormLabel>
                  <FormControl>
                    <Input placeholder="New department name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="outline" disabled={mut.isPending}>
              <Plus className="size-4" /> Add
            </Button>
          </form>
        </Form>

        <ul className="mt-4 flex flex-col divide-y">
          {(q.data ?? []).map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2.5 text-sm">
              <UsersIcon className="size-4 text-muted-foreground" />
              <span className="flex-1 font-medium">{d.name}</span>
              <Badge variant="secondary">{d.memberCount} members</Badge>
            </li>
          ))}
          {q.data?.length === 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">
              ยังไม่มีแผนก
            </li>
          )}
        </ul>
        {form.formState.errors.root && (
          <p className="mt-2 text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
      </div>
    </section>
  )
}
