import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useForm } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowUpDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Ellipsis,
  FileDown,
  FilePenLine,
  MailPlus,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  UserCheck,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query-keys'
import { Role } from '@/lib/roles'
import { authClient } from '@/features/auth/auth-client'
import {
  createDepartment,
  createUser,
  listDepartments,
  listUsers,
  updateUser,
} from '@/features/users/users.functions'
import { listRoles } from '@/features/settings/rbac.functions'
import { createDepartmentInputSchema } from '@/features/users/users.schema'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { StatusBadge } from '@/components/ui/status-badge'
import type { UserStatus } from '@/components/ui/status-badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

type UserRecord = {
  id: string
  name: string
  email: string
  role: string
  departmentId: number | null
  departmentName: string | null
  createdAt: Date
  emailVerified?: boolean
  username?: string | null
  status?: UserStatus
  phoneNumber?: string | null
  lastLoginAt?: Date | null
}

type DepartmentRecord = {
  id: number
  name: string
  memberCount: number
}

type RoleRecord = {
  key: string
  label: string
  description: string
  isSystem: boolean
  memberCount: number
}

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
]

const newUserFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(80),
    lastName: z.string().trim().max(80),
    username: z.string().trim().max(80),
    email: z.string().trim().toLowerCase().email('Invalid email'),
    phoneNumber: z.string().trim().max(40),
    role: z.string().trim().min(1, 'Role is required').max(64),
    departmentId: z.string(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmPassword && values.confirmPassword !== values.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      })
    }
  })

type NewUserFormValues = z.input<typeof newUserFormSchema>
type UserFormValues = NewUserFormValues

const inviteUserFormSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  role: z.string().trim().min(1, 'Role is required').max(64),
  description: z.string().trim().max(500, 'Description is too long'),
})

type InviteUserFormValues = z.input<typeof inviteUserFormSchema>

const editUserFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(80),
    lastName: z.string().trim().max(80),
    username: z.string().trim().max(80),
    email: z.string().trim().toLowerCase().email('Invalid email'),
    phoneNumber: z.string().trim().max(40),
    role: z.string().trim().min(1, 'Role is required').max(64),
    departmentId: z.string(),
    password: z.string().refine((value) => !value || value.length >= 8, {
      message: 'Password must be at least 8 characters',
    }),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.password && values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      })
    }
  })

type EditUserFormValues = UserFormValues

const EMPTY_DEPARTMENTS: DepartmentRecord[] = []

const deactivateUserFormSchema = z.object({
  email: z.string().trim().min(1, 'Enter the email to confirm deactivation.'),
})

type DeactivateUserFormValues = z.input<typeof deactivateUserFormSchema>

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const COUNT_FORMATTER = new Intl.NumberFormat('en-US')

function useErrorShake() {
  const [shakingFields, setShakingFields] = useState<string[]>([])
  const frameRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  function trigger(errors: unknown) {
    const fields = Object.keys(
      (errors ?? {}) as Record<string, unknown>,
    ).filter((field) => field !== 'root')

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    setShakingFields([])

    if (fields.length === 0) return

    frameRef.current = requestAnimationFrame(() => {
      setShakingFields(fields)
      frameRef.current = null
    })

    const styles = getComputedStyle(document.documentElement)
    const readMilliseconds = (name: string, fallback: number) => {
      const value = Number.parseFloat(styles.getPropertyValue(name))
      return Number.isFinite(value) ? value : fallback
    }
    const shakeMs =
      readMilliseconds('--shake-dur-a', 80) * 2 +
      readMilliseconds('--shake-dur-b', 60) * 2

    timerRef.current = setTimeout(() => {
      setShakingFields([])
      timerRef.current = null
    }, shakeMs + 20)
  }

  return { shakingFields, trigger }
}

function errorWrapClass(hasError: boolean) {
  return `t-input-wrap ${hasError ? 'is-error' : ''}`
}

function errorInputClass(
  name: string,
  hasError: boolean,
  shakingFields: string[],
) {
  return `t-input ${hasError ? 'is-error' : ''} ${
    shakingFields.includes(name) ? 'is-shaking' : ''
  }`
}

function formatDate(date: Date | null | undefined) {
  if (!date) return '—'
  return DATE_FORMATTER.format(date)
}

function formatCount(value: number) {
  return COUNT_FORMATTER.format(value)
}

function getUserStatus(
  user: Pick<UserRecord, 'emailVerified' | 'status'>,
): UserStatus {
  return user.status ?? (user.emailVerified === false ? 'invited' : 'active')
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function splitUserName(name: string) {
  const [firstName = '', ...lastNameParts] = name.trim().split(/\s+/)
  return { firstName, lastName: lastNameParts.join(' ') }
}

function RoleIcon({ role }: { role: string }) {
  if (role === Role.Admin) return <ShieldCheck className="size-4" />
  if (role === Role.Manager) return <UsersRound className="size-4" />
  return <UserCheck className="size-4" />
}

export function UsersPage() {
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user.role === Role.Admin

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

  return <AdminUsersView />
}

function AdminUsersView() {
  const usersFn = useServerFn(listUsers)
  const departmentsFn = useServerFn(listDepartments)
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => usersFn(),
  })
  const departmentsQuery = useQuery({
    queryKey: queryKeys.departments,
    queryFn: () => departmentsFn(),
  })
  const users = (usersQuery.data ?? []) as UserRecord[]
  const departments = (departmentsQuery.data ?? []) as DepartmentRecord[]
  const rolesFn = useServerFn(listRoles)
  const rolesQuery = useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => rolesFn(),
  })
  const roles = (rolesQuery.data ?? []) as RoleRecord[]

  return (
    <div className="min-h-full bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-420 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <a href="/" className="transition-colors hover:text-foreground">
                Home
              </a>
              <ChevronRight className="size-3.5" />
              <a
                href="/users"
                aria-current="page"
                className="font-medium text-foreground transition-colors hover:text-foreground"
              >
                Users
              </a>
            </nav>
            <h1
              aria-label="Users"
              className="text-2xl font-semibold tracking-tight"
            >
              User List
            </h1>
          </div>
          <NewUserForm roles={roles} />
        </div>

        <UsersStats users={users} isLoading={usersQuery.isLoading} />

        <UsersTable
          users={users}
          departments={departments}
          roles={roles}
          isLoading={usersQuery.isLoading}
        />

        <DepartmentsCard
          departments={departments}
          isLoading={departmentsQuery.isLoading}
        />
      </div>
    </div>
  )
}

function UsersStats({
  users,
  isLoading,
}: {
  users: UserRecord[]
  isLoading: boolean
}) {
  const stats = useMemo(() => {
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const newUsers = users.filter((user) => user.createdAt >= monthAgo).length
    const pendingVerifications = users.filter(
      (user) => getUserStatus(user) === 'invited',
    ).length
    const activeUsers = users.filter(
      (user) => getUserStatus(user) === 'active',
    ).length
    const total = users.length

    return {
      total,
      newUsers,
      pendingVerifications,
      activeUsers,
      pendingPercent: total
        ? Math.round((pendingVerifications / total) * 100)
        : 0,
      activePercent: total ? Math.round((activeUsers / total) * 100) : 0,
    }
  }, [users])

  const cards = [
    {
      label: 'Total Users',
      value: formatCount(stats.total),
      note: 'All registered accounts',
      icon: UsersRound,
    },
    {
      label: 'New Users',
      value: `+${formatCount(stats.newUsers)}`,
      note: 'Joined in the last 30 days',
      icon: UserPlus,
    },
    {
      label: 'Pending Verifications',
      value: formatCount(stats.pendingVerifications),
      note: `${stats.pendingPercent}% of users`,
      icon: Clock3,
    },
    {
      label: 'Active Users',
      value: formatCount(stats.activeUsers),
      note: `${stats.activePercent}% of users`,
      icon: UserCheck,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-xl border bg-card px-4 py-4 shadow-xs"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <card.icon className="size-4 text-muted-foreground" />
              <span>{card.label}</span>
            </div>
            <CircleHelp className="size-4 text-muted-foreground/70" />
          </div>
          <div className="mt-4">
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {card.value}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{card.note}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

function InviteUserDialog({ roles }: { roles: RoleRecord[] }) {
  const [open, setOpen] = useState(false)
  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: {
      email: '',
      role: '',
      description: '',
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MailPlus className="size-4" />
          Invite User
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="gap-2 px-5 pt-5 pb-4 text-left sm:px-6 sm:pt-6">
          <div className="flex items-center gap-3 pr-8">
            <MailPlus className="size-7 shrink-0 stroke-[1.8]" />
            <DialogTitle className="text-balance text-lg leading-tight">
              Invite User
            </DialogTitle>
          </div>
          <DialogDescription className="text-pretty max-w-xl text-sm leading-5">
            Invite new user to join your team by sending them an email
            invitation. Assign a role to define their access level.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-4 px-5 pb-5 sm:px-6 sm:pb-6"
            onSubmit={form.handleSubmit(() => {
              toast.info('Invitation delivery is not configured yet')
            })}
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem className="gap-2">
                  <FormLabel className="text-sm font-semibold">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="eg: john.doe@gmail.com"
                      className={`h-9 px-4 text-sm ${errorInputClass('email', !!fieldState.error, [])}`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <FormItem className="gap-2">
                  <FormLabel className="text-sm font-semibold">Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger
                        className={`h-9 w-full px-4 text-sm data-[size=default]:h-9 ${errorInputClass('role', !!fieldState.error, [])}`}
                      >
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.key} value={role.key}>
                          {role.label}
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
              name="description"
              render={({ field, fieldState }) => (
                <FormItem className="gap-2">
                  <FormLabel className="text-sm font-semibold">
                    Description (optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal note to your invitation (optional)"
                      className={`min-h-16 resize-none px-4 py-3 text-sm ${errorInputClass('description', !!fieldState.error, [])}`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-9 min-w-24 px-4 text-sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-9 min-w-28 gap-2 px-4 text-sm">
                Invite
                <Send className="size-4" />
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

type UserTextFieldName =
  'firstName' | 'lastName' | 'username' | 'email' | 'phoneNumber'

function UserTextField({
  control,
  name,
  label,
  placeholder,
  type = 'text',
  ariaLabel,
  shakingFields,
}: {
  control: Control<UserFormValues>
  name: UserTextFieldName
  label: string
  placeholder?: string
  type?: 'text' | 'email'
  ariaLabel?: string
  shakingFields: string[]
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem
          className={`sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-4 ${errorWrapClass(!!fieldState.error)}`}
        >
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              aria-label={ariaLabel}
              className={`h-9 text-sm ${errorInputClass(
                name,
                !!fieldState.error,
                shakingFields,
              )}`}
              {...field}
            />
          </FormControl>
          <FormMessage className="t-error-msg sm:col-start-2" />
        </FormItem>
      )}
    />
  )
}

function UserRoleField({
  control,
  roles,
  shakingFields,
}: {
  control: Control<UserFormValues>
  roles: RoleRecord[]
  shakingFields: string[]
}) {
  return (
    <FormField
      control={control}
      name="role"
      render={({ field, fieldState }) => (
        <FormItem
          className={`sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-4 ${errorWrapClass(!!fieldState.error)}`}
        >
          <FormLabel>Role</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger
                className={`h-9 w-full text-sm data-[size=default]:h-9 ${errorInputClass('role', !!fieldState.error, shakingFields)}`}
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.key} value={role.key}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage className="t-error-msg sm:col-start-2" />
        </FormItem>
      )}
    />
  )
}

function UserPasswordField({
  control,
  name,
  label,
  placeholder,
  shakingFields,
}: {
  control: Control<UserFormValues>
  name: 'password' | 'confirmPassword'
  label: string
  placeholder: string
  shakingFields: string[]
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem
          className={`sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-4 ${errorWrapClass(!!fieldState.error)}`}
        >
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <PasswordInput
              placeholder={placeholder}
              className={`h-9 text-sm ${errorInputClass(
                name,
                !!fieldState.error,
                shakingFields,
              )}`}
              {...field}
            />
          </FormControl>
          <FormMessage className="t-error-msg sm:col-start-2" />
        </FormItem>
      )}
    />
  )
}

function UserDepartmentField({
  control,
  departments,
  shakingFields,
}: {
  control: Control<UserFormValues>
  departments: DepartmentRecord[]
  shakingFields: string[]
}) {
  return (
    <FormField
      control={control}
      name="departmentId"
      render={({ field, fieldState }) => (
        <FormItem
          className={`sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-4 ${errorWrapClass(!!fieldState.error)}`}
        >
          <FormLabel>Department</FormLabel>
          <Select
            value={field.value || 'none'}
            onValueChange={(value) =>
              field.onChange(value === 'none' ? '' : value)
            }
          >
            <FormControl>
              <SelectTrigger
                className={`h-9 w-full text-sm data-[size=default]:h-9 ${errorInputClass('departmentId', !!fieldState.error, shakingFields)}`}
              >
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">No department</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={String(department.id)}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage className="t-error-msg sm:col-start-2" />
        </FormItem>
      )}
    />
  )
}

function UserFormFields({
  control,
  departments,
  roles,
  shakingFields,
  className,
  mode,
}: {
  control: Control<UserFormValues>
  departments: DepartmentRecord[]
  roles: RoleRecord[]
  shakingFields: string[]
  className: string
  mode: 'create' | 'edit'
}) {
  const isCreate = mode === 'create'

  return (
    <div className={className}>
      <UserTextField
        control={control}
        name="firstName"
        label="First Name"
        placeholder={isCreate ? 'John' : undefined}
        ariaLabel={isCreate ? 'Name' : undefined}
        shakingFields={shakingFields}
      />
      <UserTextField
        control={control}
        name="lastName"
        label="Last Name"
        placeholder={isCreate ? 'Doe' : undefined}
        shakingFields={shakingFields}
      />
      <UserTextField
        control={control}
        name="username"
        label="Username"
        placeholder={isCreate ? 'john_doe' : undefined}
        shakingFields={shakingFields}
      />
      <UserTextField
        control={control}
        name="email"
        label="Email"
        placeholder={isCreate ? 'john.doe@gmail.com' : undefined}
        type="email"
        shakingFields={shakingFields}
      />
      <UserTextField
        control={control}
        name="phoneNumber"
        label="Phone Number"
        placeholder={isCreate ? '+123456789' : undefined}
        shakingFields={shakingFields}
      />
      <UserRoleField
        control={control}
        roles={roles}
        shakingFields={shakingFields}
      />
      <UserPasswordField
        control={control}
        name="password"
        label="Password"
        placeholder="••••••••"
        shakingFields={shakingFields}
      />
      <UserPasswordField
        control={control}
        name="confirmPassword"
        label="Confirm Password"
        placeholder={isCreate ? '••••••••' : 'Confirm new password'}
        shakingFields={shakingFields}
      />
      <UserDepartmentField
        control={control}
        departments={departments}
        shakingFields={shakingFields}
      />
    </div>
  )
}

function NewUserForm({ roles }: { roles: RoleRecord[] }) {
  const qc = useQueryClient()
  const create = useServerFn(createUser)
  const departmentsFn = useServerFn(listDepartments)
  const [open, setOpen] = useState(false)
  const { shakingFields, trigger: triggerErrorShake } = useErrorShake()
  const departmentsQuery = useQuery({
    queryKey: queryKeys.departments,
    queryFn: () => departmentsFn(),
  })

  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phoneNumber: '',
      role: Role.Member,
      departmentId: '',
      password: '',
      confirmPassword: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: NewUserFormValues) =>
      create({
        data: {
          name: [values.firstName, values.lastName].filter(Boolean).join(' '),
          email: values.email,
          username: values.username || null,
          phoneNumber: values.phoneNumber || null,
          password: values.password,
          role: values.role,
          departmentId: values.departmentId
            ? Number(values.departmentId)
            : null,
          status: 'active',
        },
      }),
    onSuccess: () => {
      setOpen(false)
      form.reset()
      qc.invalidateQueries({ queryKey: queryKeys.root })
      toast.success('สร้างผู้ใช้แล้ว')
    },
    onError: (error) => {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to create',
      })
      toast.error('สร้างผู้ใช้ไม่สำเร็จ', {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      form.reset()
      mutation.reset()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InviteUserDialog roles={roles} />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button aria-label="New user" className="gap-2">
            <Plus className="size-4" />
            Add user
          </Button>
        </DialogTrigger>

        <DialogContent
          className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl p-0 sm:max-w-lg"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
            <DialogTitle className="text-balance text-lg">
              Add New User
            </DialogTitle>
            <DialogDescription className="text-pretty text-sm leading-5">
              Create new user here. Click save when you're done.
              <span className="sr-only">
                สร้างบัญชีผู้ใช้ใหม่และกำหนดสิทธิ์
              </span>
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="grid gap-4 px-5 pb-5 sm:px-6 sm:pb-6"
              onSubmit={form.handleSubmit(
                (values) => mutation.mutate(values),
                triggerErrorShake,
              )}
              noValidate
            >
              <UserFormFields
                control={form.control}
                departments={departmentsQuery.data ?? EMPTY_DEPARTMENTS}
                roles={roles}
                shakingFields={shakingFields}
                className="grid gap-3"
                mode="create"
              />

              {form.formState.errors.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="h-9 px-4 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  aria-label="Create user"
                  disabled={mutation.isPending}
                  className="h-9 px-4 text-sm"
                >
                  Save changes
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UsersTable({
  users,
  departments,
  roles,
  isLoading,
}: {
  users: UserRecord[]
  departments: DepartmentRecord[]
  roles: RoleRecord[]
  isLoading: boolean
}) {
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<UserStatus[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')
  const [emailSort, setEmailSort] = useState<'asc' | 'desc'>('asc')
  const selectedStatusSet = useMemo(
    () => new Set(selectedStatuses),
    [selectedStatuses],
  )
  const selectedRoleSet = useMemo(() => new Set(selectedRoles), [selectedRoles])
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_OPTIONS.map((option) => [
          option.value,
          users.filter((user) => getUserStatus(user) === option.value).length,
        ]),
      ) as Record<UserStatus, number>,
    [users],
  )
  const roleCounts = useMemo(
    () =>
      Object.fromEntries(
        roles.map((role) => [
          role.key,
          users.filter((user) => user.role === role.key).length,
        ]),
      ) as Record<string, number>,
    [roles, users],
  )

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return users
      .filter((user) => {
        if (
          selectedStatuses.length > 0 &&
          !selectedStatusSet.has(getUserStatus(user))
        ) {
          return false
        }
        if (selectedRoles.length > 0 && !selectedRoleSet.has(user.role)) {
          return false
        }
        if (!normalizedSearch) return true
        return [user.name, user.email, user.departmentName ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      })
      .sort((left, right) => {
        const comparison = left.email.localeCompare(right.email)
        return emailSort === 'asc' ? comparison : -comparison
      })
  }, [
    emailSort,
    search,
    selectedRoleSet,
    selectedRoles.length,
    selectedStatusSet,
    selectedStatuses.length,
    users,
  ])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / Number(pageSize)),
  )
  const currentPage = Math.min(page, totalPages)
  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * Number(pageSize),
    currentPage * Number(pageSize),
  )
  const visibleIds = visibleUsers.map((user) => user.id)
  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds])
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id))

  function updateFilters<T extends string>(
    current: T[],
    value: T,
    setter: (values: T[]) => void,
  ) {
    setter(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    )
    setPage(1)
  }

  function toggleSelectAll() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIdSet.has(id))
      }
      return [...new Set([...current, ...visibleIds])]
    })
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    )
  }

  function handlePageSizeChange(value: string) {
    setPageSize(value)
    setPage(1)
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative min-w-55 flex-1 sm:w-64 sm:flex-none">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Filter users"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Filter users..."
            className="h-10 pl-9"
          />
        </div>

        <FilterPopover
          label="Status"
          options={STATUS_OPTIONS.map((option) => ({
            ...option,
            count: statusCounts[option.value],
          }))}
          selected={selectedStatuses}
          onToggle={(value) =>
            updateFilters(
              selectedStatuses,
              value as UserStatus,
              setSelectedStatuses,
            )
          }
        />
        <FilterPopover
          label="Role"
          options={roles.map((role) => ({
            value: role.key,
            label: role.label,
            count: roleCounts[role.key] ?? 0,
          }))}
          selected={selectedRoles}
          onToggle={(value) =>
            updateFilters(selectedRoles, value, setSelectedRoles)
          }
          renderOptionIcon={(value) => <RoleIcon role={value} />}
        />

        <Button variant="outline" className="ml-auto h-10 gap-2">
          <SlidersHorizontal className="size-4" />
          View
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-270 text-sm">
          <thead>
            <tr className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
              <th className="w-12 px-4 py-3">
                <CheckboxCheck
                  checked={allVisibleSelected}
                  label="Select all users"
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 font-medium hover:text-foreground"
                  onClick={() =>
                    setEmailSort((current) =>
                      current === 'asc' ? 'desc' : 'asc',
                    )
                  }
                >
                  Email
                  <ArrowUpDown className="size-3.5" />
                  <span className="sr-only">
                    Sort email{' '}
                    {emailSort === 'asc' ? 'descending' : 'ascending'}
                  </span>
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Phone Number</th>
              <th className="px-4 py-3 font-medium">Registered Date</th>
              <th className="px-4 py-3 font-medium">Last Login Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="w-12 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-5">
                  <Skeleton className="h-8 w-full" />
                </td>
              </tr>
            )}
            {!isLoading && visibleUsers.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            )}
            {!isLoading &&
              visibleUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  departments={departments}
                  roles={roles}
                  selected={selectedIdSet.has(user.id)}
                  onToggleSelected={() => toggleSelected(user.id)}
                />
              ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        isPending={isLoading}
        onPageChange={setPage}
        summary={
          <span>
            {selectedIds.length} of {filteredUsers.length} row(s) selected.
          </span>
        }
        pageLabel={`Page ${currentPage} of ${totalPages}`}
        pageSize={Number(pageSize)}
        pageSizeOptions={[10, 20, 50]}
        onPageSizeChange={(value) => handlePageSizeChange(String(value))}
        className="border-t px-4 py-3 text-xs text-muted-foreground"
      />
    </section>
  )
}

const CHECK_PATH = 'M1 5.52L3.92 9.17L9.17 1'

function CheckboxIndicator({ checked }: { checked: boolean }) {
  return (
    <span
      aria-checked={checked}
      aria-hidden="true"
      className={`t-check flex size-4 shrink-0 items-center justify-center rounded-[5px] border ${
        checked
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-muted-foreground/50 bg-background'
      }`}
    >
      <svg viewBox="0 0 10.1668 10.1668" className="size-3" fill="none">
        <path
          d={CHECK_PATH}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    </span>
  )
}

function CheckboxCheck({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean
  label: string
  onCheckedChange: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onCheckedChange}
      className={`t-check flex size-4 shrink-0 items-center justify-center rounded-[5px] border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
        checked
          ? 'border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
          : 'border-input bg-background shadow-xs hover:bg-muted/50'
      }`}
    >
      <svg viewBox="0 0 10.1668 10.1668" className="size-3" fill="none">
        <path
          d={CHECK_PATH}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    </button>
  )
}

function FilterPopover({
  label,
  options,
  selected,
  onToggle,
  renderOptionIcon,
}: {
  label: string
  options: Array<{ value: string; label: string; count: number }>
  selected: string[]
  onToggle: (value: string) => void
  renderOptionIcon?: (value: string) => React.ReactNode
}) {
  const [search, setSearch] = useState('')
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 border-dashed">
          <Plus className="size-4" />
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1.5 py-0">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="relative border-b p-2">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={`Search ${label}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={label}
            className="h-9 border-0 pl-8 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="space-y-1 p-2">
          {visibleOptions.map((option) => {
            const checked = selectedSet.has(option.value)
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={checked}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => onToggle(option.value)}
              >
                <CheckboxIndicator checked={checked} />
                {renderOptionIcon?.(option.value)}
                <span className="flex-1">{option.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {option.count}
                </span>
              </button>
            )
          })}
          {visibleOptions.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No matches.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function EditUserDialog({
  user,
  departments,
  roles,
  open,
  onOpenChange,
}: {
  user: UserRecord
  departments: DepartmentRecord[]
  roles: RoleRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const update = useServerFn(updateUser)
  const { shakingFields, trigger: triggerErrorShake } = useErrorShake()
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      ...splitUserName(user.name),
      username: user.username ?? '',
      email: user.email,
      phoneNumber: user.phoneNumber ?? '',
      role: user.role,
      departmentId: user.departmentId ? String(user.departmentId) : '',
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      ...splitUserName(user.name),
      username: user.username ?? '',
      email: user.email,
      phoneNumber: user.phoneNumber ?? '',
      role: user.role,
      departmentId: user.departmentId ? String(user.departmentId) : '',
      password: '',
      confirmPassword: '',
    })
  }, [form, open, user])

  const mutation = useMutation({
    mutationFn: (values: EditUserFormValues) =>
      update({
        data: {
          id: user.id,
          name: [values.firstName, values.lastName].filter(Boolean).join(' '),
          email: values.email,
          username: values.username || null,
          phoneNumber: values.phoneNumber || null,
          role: values.role,
          departmentId: values.departmentId
            ? Number(values.departmentId)
            : null,
          password: values.password || undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.root })
      onOpenChange(false)
      toast.success('อัปเดตข้อมูลผู้ใช้แล้ว')
    },
    onError: (error) => {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to update',
      })
      toast.error('อัปเดตผู้ใช้ไม่สำเร็จ', {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pt-5 pb-4 text-left sm:px-6 sm:pt-6">
          <DialogTitle className="text-balance text-lg">Edit User</DialogTitle>
          <DialogDescription className="text-pretty text-sm leading-5">
            Update the user here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-4 px-5 pb-5 sm:px-6 sm:pb-6"
            onSubmit={form.handleSubmit(
              (values) => mutation.mutate(values),
              triggerErrorShake,
            )}
            noValidate
          >
            <UserFormFields
              control={form.control}
              departments={departments}
              roles={roles}
              shakingFields={shakingFields}
              className="grid gap-4"
              mode="edit"
            />

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="h-9 px-4 text-sm"
              >
                Save changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function UserDetailDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg">View Detail</DialogTitle>
          <DialogDescription>
            Account details for {user.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 text-sm">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 bg-muted">
              <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold">{user.name}</p>
              <p className="truncate text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <dl className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Username</dt>
              <dd className="mt-1 font-medium">{user.username || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Phone Number</dt>
              <dd className="mt-1 font-medium">{user.phoneNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="mt-1 font-medium">{roleLabel(user.role)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Department</dt>
              <dd className="mt-1 font-medium">{user.departmentName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={getUserStatus(user)} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last login</dt>
              <dd className="mt-1 font-medium">
                {formatDate(user.lastLoginAt)}
              </dd>
            </div>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeactivateUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const update = useServerFn(updateUser)
  const { shakingFields, trigger: triggerErrorShake } = useErrorShake()
  const form = useForm<DeactivateUserFormValues>({
    resolver: zodResolver(deactivateUserFormSchema),
    defaultValues: { email: '' },
  })
  const enteredEmail = form.watch('email')

  useEffect(() => {
    if (open) form.reset({ email: '' })
  }, [form, open])

  const mutation = useMutation({
    mutationFn: () => update({ data: { id: user.id, status: 'inactive' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.root })
      onOpenChange(false)
      toast.success('ปิดใช้งานผู้ใช้แล้ว')
    },
    onError: (error) => {
      form.setError('root', {
        message:
          error instanceof Error ? error.message : 'Failed to deactivate',
      })
      toast.error('ปิดใช้งานผู้ใช้ไม่สำเร็จ', {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl p-5 sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-balance flex items-center gap-2 text-lg text-destructive">
            <TriangleAlert className="size-5" />
            Deactivate
          </DialogTitle>
          <DialogDescription className="text-pretty text-sm leading-5">
            Are you sure you want to deactivate the account with the email{' '}
            <strong className="font-semibold text-foreground">
              {user.email}
            </strong>
            ?
            <br />
            This action will remove the user with the role of{' '}
            <strong className="font-semibold text-foreground">
              {user.role.toUpperCase()}
            </strong>{' '}
            from the system. Please proceed with caution.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-3"
            onSubmit={form.handleSubmit(
              () => mutation.mutate(),
              triggerErrorShake,
            )}
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem className={errorWrapClass(!!fieldState.error)}>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter the email to confirm deactivation."
                      className={`h-9 text-sm ${errorInputClass(
                        'email',
                        !!fieldState.error,
                        shakingFields,
                      )}`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="t-error-msg" />
                </FormItem>
              )}
            />
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              <p className="font-semibold">Warning!</p>
              <p className="mt-1">
                Please be careful, this operation cannot be rolled back.
              </p>
            </div>
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-9 px-4 text-sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="h-9 px-4 text-sm"
                disabled={enteredEmail !== user.email || mutation.isPending}
              >
                Deactivate
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function UserRow({
  user,
  departments,
  roles,
  selected,
  onToggleSelected,
}: {
  user: UserRecord
  departments: DepartmentRecord[]
  roles: RoleRecord[]
  selected: boolean
  onToggleSelected: () => void
}) {
  const qc = useQueryClient()
  const update = useServerFn(updateUser)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const mutation = useMutation({
    mutationFn: (patch: { role?: string; departmentId?: number | null }) =>
      update({ data: { id: user.id, ...patch } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.root })
      toast.success('อัปเดตข้อมูลผู้ใช้แล้ว')
    },
    onError: (error) =>
      toast.error('อัปเดตผู้ใช้ไม่สำเร็จ', {
        description: error instanceof Error ? error.message : undefined,
      }),
  })

  return (
    <tr className="group align-middle transition-colors hover:bg-muted/30">
      <td className="px-4 py-3">
        <CheckboxCheck
          checked={selected}
          label={`Select ${user.name}`}
          onCheckedChange={onToggleSelected}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex min-w-[170px] items-center gap-3">
          <Avatar size="sm" className="bg-muted">
            <AvatarFallback className="bg-muted text-[11px] font-medium text-muted-foreground">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            className="truncate font-medium underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
            onClick={() => setDetailOpen(true)}
          >
            {user.name}
          </button>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {user.phoneNumber ?? '—'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
        {formatDate(user.createdAt)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
        {formatDate(user.lastLoginAt)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={getUserStatus(user)} />
      </td>
      <td className="px-4 py-3">
        <Select
          value={user.role}
          onValueChange={(value) => mutation.mutate({ role: value })}
          disabled={mutation.isPending}
        >
          <SelectTrigger
            aria-label={`Role for ${user.name}`}
            className="h-8 w-33 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          >
            <RoleIcon role={user.role} />
            <span className="flex-1 text-left">{roleLabel(user.role)}</span>
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.key} value={role.key}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="sr-only">
          <Select
            value={user.departmentId ? String(user.departmentId) : 'none'}
            onValueChange={(value) =>
              mutation.mutate({
                departmentId: value === 'none' ? null : Number(value),
              })
            }
            disabled={mutation.isPending}
          >
            <SelectTrigger aria-label={`Department for ${user.name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={String(department.id)}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${user.name}`}
              className="size-8 opacity-60 transition-opacity group-hover:opacity-100"
            >
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setDetailOpen(true)}>
              <FileDown className="size-4" />
              View Detail
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <FilePenLine className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={getUserStatus(user) === 'inactive'}
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeactivateOpen(true)}
            >
              <Trash2 className="size-4" />
              Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <UserDetailDialog
        user={user}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <EditUserDialog
        user={user}
        departments={departments}
        roles={roles}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeactivateUserDialog
        user={user}
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
      />
    </tr>
  )
}

function DepartmentsCard({
  departments,
  isLoading,
}: {
  departments: DepartmentRecord[]
  isLoading: boolean
}) {
  const qc = useQueryClient()
  const create = useServerFn(createDepartment)
  const form = useForm<z.input<typeof createDepartmentInputSchema>>({
    resolver: zodResolver(createDepartmentInputSchema),
    defaultValues: { name: '' },
  })
  const { shakingFields, trigger: triggerErrorShake } = useErrorShake()
  const mutation = useMutation({
    mutationFn: (values: z.input<typeof createDepartmentInputSchema>) =>
      create({ data: values }),
    onSuccess: () => {
      form.reset()
      qc.invalidateQueries({ queryKey: queryKeys.departments })
      toast.success('เพิ่มแผนกแล้ว')
    },
    onError: (error) => {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to create',
      })
      toast.error('เพิ่มแผนกไม่สำเร็จ', {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  return (
    <section className="max-w-xl rounded-xl border bg-card shadow-xs">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <ShieldCheck className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Departments</h2>
      </div>
      <div className="p-5">
        <Form {...form}>
          <form
            className="flex items-end gap-2"
            onSubmit={form.handleSubmit(
              (values) => mutation.mutate(values),
              triggerErrorShake,
            )}
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem
                  className={`flex-1 ${errorWrapClass(!!fieldState.error)}`}
                >
                  <FormLabel className="sr-only">Department name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="New department name"
                      className={errorInputClass(
                        'name',
                        !!fieldState.error,
                        shakingFields,
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="t-error-msg" />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={mutation.isPending}
            >
              <Plus className="size-4" /> Add
            </Button>
          </form>
        </Form>

        <ul className="mt-4 flex flex-col divide-y">
          {isLoading && <Skeleton className="h-8 w-full" />}
          {!isLoading &&
            departments.map((department) => (
              <li
                key={department.id}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <UsersRound className="size-4 text-muted-foreground" />
                <span className="flex-1 font-medium">{department.name}</span>
                <Badge variant="secondary">
                  {department.memberCount} members
                </Badge>
              </li>
            ))}
          {!isLoading && departments.length === 0 && (
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
