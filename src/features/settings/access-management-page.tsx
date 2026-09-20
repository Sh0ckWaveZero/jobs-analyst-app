import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Building2,
  CircleHelp,
  Edit3,
  KeyRound,
  LockKeyhole,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react'
import type { z } from 'zod'
import { toast } from 'sonner'

import { authClient } from '@/features/auth/auth-client'
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  listUsers,
  updateDepartment,
  updateUser,
} from '@/features/users/users.functions'
import {
  createRole,
  createPermission,
  deleteRole,
  listRoles,
  listRbacMatrix,
  updateRole,
  updateRolePermissions,
} from '@/features/settings/rbac.functions'
import { createDepartmentInputSchema } from '@/features/users/users.schema'
import {
  createPermissionInputSchema,
  createRoleInputSchema,
} from '@/features/settings/rbac.schema'
import type {
  CreatePermissionInput,
  CreateRoleInput,
} from '@/features/settings/rbac.schema'
import { queryKeys } from '@/lib/query-keys'
import { isBuiltInRole, Role } from '@/lib/roles'
import type { UserRole } from '@/lib/roles'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { SettingsBreadcrumb } from '@/features/settings/settings-page'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

export type AccessSection = 'departments' | 'roles'

type DepartmentRecord = {
  id: number
  name: string
  memberCount: number
}

type UserRecord = {
  id: string
  name: string
  email: string
  role: string
  departmentName: string | null
  emailVerified?: boolean
}

type AccessRoleRecord = {
  key: string
  label: string
  description: string
  isSystem: boolean
  memberCount: number
}

type RbacMatrixRecord = {
  roles: AccessRoleRecord[]
  permissions: Array<{
    key: string
    group: string
    label: string
    description: string
    isSystem?: boolean
    protectedForAdmin?: boolean
    enabled: Record<string, boolean>
  }>
}

const EMPTY_DEPARTMENTS: DepartmentRecord[] = []
const EMPTY_USERS: UserRecord[] = []
const EMPTY_ACCESS_ROLES: AccessRoleRecord[] = []
const COUNT_FORMATTER = new Intl.NumberFormat('en-US')

type DepartmentFormValues = z.input<typeof createDepartmentInputSchema>

type RoleDetail = {
  label: string
  eyebrow: string
  description: string
  permissions: string[]
  icon: LucideIcon
}

const ROLE_DETAILS: Record<UserRole, RoleDetail> = {
  [Role.Admin]: {
    label: 'Admin',
    eyebrow: 'Full workspace access',
    description: 'ดูแลสมาชิก โครงสร้างทีม และข้อมูลทั้งหมดของ workspace',
    permissions: [
      'จัดการผู้ใช้ แผนก และ role',
      'สร้างและแก้ไขทุกโปรเจกต์',
      'ดูรายงานชั่วโมงของทุกคน',
    ],
    icon: ShieldCheck,
  },
  [Role.Manager]: {
    label: 'Manager',
    eyebrow: 'Team operations',
    description: 'ดูแลโปรเจกต์และติดตามงานของทีมที่รับผิดชอบ',
    permissions: [
      'สร้างโปรเจกต์และจัดการ issue',
      'assign งานให้สมาชิกในทีม',
      'ดูชั่วโมงของทีมที่เกี่ยวข้อง',
    ],
    icon: UsersRound,
  },
  [Role.Member]: {
    label: 'Member',
    eyebrow: 'Individual contributor',
    description: 'ทำงานใน issue ที่ได้รับมอบหมายและบันทึกชั่วโมงของตัวเอง',
    permissions: [
      'ดู issue ที่อยู่ในขอบเขตของตัวเอง',
      'บันทึกและแก้ไข work log ของตัวเอง',
      'ดูรายงานชั่วโมงของตัวเอง',
    ],
    icon: UserRound,
  },
}

function formatCount(value: number) {
  return COUNT_FORMATTER.format(value)
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function AccessManagementPage({
  section = 'departments',
  embedded = false,
  isAdmin,
}: {
  section?: AccessSection
  embedded?: boolean
  isAdmin?: boolean
}) {
  const { data: session } = authClient.useSession()
  const canAccess = isAdmin ?? session?.user.role === Role.Admin

  if (!canAccess) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Access management
        </h1>
        <p className="mt-2 text-sm text-destructive">
          Forbidden — หน้านี้สำหรับ admin เท่านั้น
        </p>
      </div>
    )
  }

  return <AdminAccessView section={section} embedded={embedded} />
}

function AdminAccessView({
  section,
  embedded,
}: {
  section: AccessSection
  embedded: boolean
}) {
  const usersFn = useServerFn(listUsers)
  const departmentsFn = useServerFn(listDepartments)
  const rolesFn = useServerFn(listRoles)
  const rbacFn = useServerFn(listRbacMatrix)
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => usersFn(),
  })
  const departmentsQuery = useQuery({
    queryKey: queryKeys.departments,
    queryFn: () => departmentsFn(),
  })
  const rolesQuery = useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => rolesFn(),
  })
  const rbacQuery = useQuery({
    queryKey: queryKeys.rbac,
    queryFn: () => rbacFn(),
    enabled: section === 'roles',
  })
  const users = usersQuery.data ?? EMPTY_USERS
  const departments = departmentsQuery.data ?? EMPTY_DEPARTMENTS
  const roles = rolesQuery.data ?? EMPTY_ACCESS_ROLES

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

  const isRoleSection = section === 'roles'

  return (
    <div
      className={
        embedded
          ? 'space-y-6'
          : 'min-h-full bg-muted/20 px-4 py-6 sm:px-6 lg:px-8'
      }
    >
      <div className={embedded ? 'space-y-6' : 'mx-auto max-w-360 space-y-6'}>
        <SettingsBreadcrumb current="Access management" tab="access" />
        <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {isRoleSection ? 'Roles & permissions' : 'Departments'}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                {isRoleSection
                  ? 'สร้าง role แบบกำหนดเองและกำหนด permission จาก catalog กลางของระบบ'
                  : 'จัดโครงสร้างทีมและกำหนดขอบเขตการทำงานของสมาชิกใน workspace'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5 px-2.5 py-1">
            <ShieldCheck className="size-3.5" />
            Admin only
          </Badge>
        </div>

        <AccessSummary
          departmentCount={departments.length}
          userCount={users.length}
          roleCount={roles.length}
          isLoading={
            usersQuery.isLoading ||
            departmentsQuery.isLoading ||
            rolesQuery.isLoading
          }
        />

        <AccessSectionTabs section={section} />

        {section === 'departments' ? (
          <DepartmentsPanel
            departments={departments}
            isLoading={departmentsQuery.isLoading}
            isError={departmentsQuery.isError}
          />
        ) : (
          <RolesPanel
            users={users}
            roles={roles}
            roleCounts={roleCounts}
            isLoading={usersQuery.isLoading}
            isError={usersQuery.isError}
            rbac={rbacQuery.data}
            isRbacLoading={rbacQuery.isLoading}
            isRbacError={rbacQuery.isError}
          />
        )}
      </div>
    </div>
  )
}

function moveSlidingTab(pill: HTMLElement, tab: HTMLElement, animate: boolean) {
  if (!animate) {
    const previousTransition = pill.style.transition
    pill.style.transition = 'none'
    pill.style.transform = `translateX(${tab.offsetLeft}px)`
    pill.style.width = `${tab.offsetWidth}px`
    void pill.offsetWidth
    pill.style.transition = previousTransition
    return
  }

  pill.style.transform = `translateX(${tab.offsetLeft}px)`
  pill.style.width = `${tab.offsetWidth}px`
}

function AccessSectionTabs({ section }: { section: AccessSection }) {
  const tabsRef = useRef<HTMLElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const hasPositionedRef = useRef(false)

  useEffect(() => {
    const bar = tabsRef.current
    const pill = pillRef.current
    if (!bar || !pill) return

    const getActiveTab = () =>
      Array.from(bar.querySelectorAll<HTMLElement>('.t-tab')).find(
        (tab) => tab.getAttribute('aria-selected') === 'true',
      )

    const positionActiveTab = (animate: boolean) => {
      const activeTab = getActiveTab()
      if (activeTab) moveSlidingTab(pill, activeTab, animate)
    }

    const frame = window.requestAnimationFrame(() => {
      positionActiveTab(hasPositionedRef.current)
      hasPositionedRef.current = true
    })
    const handleResize = () => positionActiveTab(false)

    window.addEventListener('resize', handleResize)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
    }
  }, [section])

  function handleTabClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    const bar = tabsRef.current
    const pill = pillRef.current
    if (!bar || !pill) return

    const tab = event.currentTarget
    Array.from(bar.querySelectorAll<HTMLElement>('.t-tab')).forEach((item) =>
      item.setAttribute('aria-selected', String(item === tab)),
    )
    moveSlidingTab(pill, tab, true)
  }

  return (
    <nav
      ref={tabsRef}
      aria-label="Access management sections"
      className="t-tabs"
      role="tablist"
    >
      <span ref={pillRef} aria-hidden="true" className="t-tabs-pill" />
      <AccessTab
        to="/settings"
        search={{ tab: 'access', section: 'departments' }}
        active={section === 'departments'}
        icon={Building2}
        onClick={handleTabClick}
      >
        Departments
      </AccessTab>
      <AccessTab
        to="/settings"
        search={{ tab: 'access', section: 'roles' }}
        active={section === 'roles'}
        icon={KeyRound}
        onClick={handleTabClick}
      >
        Roles & permissions
      </AccessTab>
    </nav>
  )
}

function AccessSummary({
  departmentCount,
  userCount,
  roleCount,
  isLoading,
}: {
  departmentCount: number
  userCount: number
  roleCount: number
  isLoading: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SummaryMetric
        label="Departments"
        value={departmentCount}
        note="Team boundaries for assignment"
        icon={Building2}
        isLoading={isLoading}
      />
      <SummaryMetric
        label="Workspace members"
        value={userCount}
        note="Members across all departments"
        icon={UsersRound}
        isLoading={isLoading}
      />
      <SummaryMetric
        label="Roles"
        value={roleCount}
        note="Built-in and custom roles"
        icon={KeyRound}
        isLoading={isLoading}
      />
    </div>
  )
}

function SummaryMetric({
  label,
  value,
  note,
  icon: Icon,
  isLoading,
}: {
  label: string
  value: number
  note: string
  icon: LucideIcon
  isLoading: boolean
}) {
  return (
    <article className="rounded-xl border bg-card px-4 py-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" />
          <span>{label}</span>
        </div>
        <CircleHelp className="size-4 text-muted-foreground/70" />
      </div>
      <div className="mt-4">
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatCount(value)}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </div>
    </article>
  )
}

function AccessTab({
  to,
  search,
  active,
  icon: Icon,
  onClick,
  children,
}: {
  to: '/settings'
  search: { tab: 'access'; section: AccessSection }
  active: boolean
  icon: LucideIcon
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  children: string
}) {
  return (
    <Link
      to={to}
      search={search}
      role="tab"
      aria-current={active ? 'page' : undefined}
      aria-selected={active}
      className="t-tab flex items-center gap-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onClick={onClick}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  )
}

function DepartmentsPanel({
  departments,
  isLoading,
  isError,
}: {
  departments: DepartmentRecord[]
  isLoading: boolean
  isError: boolean
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<
    DepartmentRecord | undefined
  >()

  const filteredDepartments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return departments
    return departments.filter((department) =>
      department.name.toLowerCase().includes(normalizedSearch),
    )
  }, [departments, search])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDepartments.length / pageSize),
  )
  const currentPage = Math.min(page, totalPages)
  const visibleDepartments = filteredDepartments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  function openCreateDialog() {
    setEditingDepartment(undefined)
    setDialogOpen(true)
  }

  function openEditDialog(department: DepartmentRecord) {
    setEditingDepartment(department)
    setDialogOpen(true)
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">Departments</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            ใช้แผนกเพื่อจัดกลุ่มสมาชิกและกำหนดขอบเขตการ assign งาน
          </p>
        </div>
        <Button onClick={openCreateDialog} className="w-fit gap-2">
          <Plus className="size-4" />
          Add department
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
        <div className="relative min-w-55 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Filter departments"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Filter departments..."
            className="h-10 pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {formatCount(filteredDepartments.length)} departments
        </span>
      </div>

      {isError ? (
        <DataState
          title="Could not load departments"
          description="ลอง refresh หน้าอีกครั้งเพื่อโหลดข้อมูลใหม่"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-155 text-sm">
              <thead>
                <tr className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Members</th>
                  <th className="w-28 px-5 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && (
                  <tr>
                    <td colSpan={3} className="px-5 py-5">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                )}
                {!isLoading && visibleDepartments.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      {search ? 'No departments found.' : 'ยังไม่มีแผนก'}
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  visibleDepartments.map((department) => (
                    <tr
                      key={department.id}
                      className="transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="size-4" />
                          </span>
                          <div>
                            <p className="font-medium">{department.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Department ID · {department.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="secondary" className="gap-1">
                          <UsersRound className="size-3.5" />
                          {formatCount(department.memberCount)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${department.name}`}
                            onClick={() => openEditDialog(department)}
                          >
                            <Edit3 className="size-4" />
                          </Button>
                          <DeleteDepartmentDialog department={department} />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            summary={<span>{filteredDepartments.length} departments</span>}
            pageLabel={`Page ${currentPage} of ${totalPages}`}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 20]}
            onPageSizeChange={(value) => {
              setPageSize(value)
              setPage(1)
            }}
            className="border-t px-5 py-3 text-xs text-muted-foreground"
          />
        </>
      )}

      <DepartmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={editingDepartment}
      />
    </section>
  )
}

function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  department?: DepartmentRecord
}) {
  const queryClient = useQueryClient()
  const createFn = useServerFn(createDepartment)
  const updateFn = useServerFn(updateDepartment)
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(createDepartmentInputSchema),
    defaultValues: { name: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: DepartmentFormValues) =>
      department
        ? updateFn({ data: { id: department.id, name: values.name } })
        : createFn({ data: values }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments })
      form.reset()
      onOpenChange(false)
      toast.success(department ? 'อัปเดตแผนกแล้ว' : 'เพิ่มแผนกแล้ว')
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'บันทึกแผนกไม่สำเร็จ')
      form.setError('root', { message })
      toast.error(department ? 'อัปเดตแผนกไม่สำเร็จ' : 'เพิ่มแผนกไม่สำเร็จ', {
        description: message,
      })
    },
  })
  const resetMutation = mutation.reset

  useEffect(() => {
    if (!open) return
    form.reset({ name: department?.name ?? '' })
    resetMutation()
  }, [department?.id, department?.name, form, open, resetMutation])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>
            {department ? 'Edit department' : 'Add department'}
          </DialogTitle>
          <DialogDescription>
            {department
              ? 'แก้ชื่อแผนกให้ตรงกับโครงสร้างทีมปัจจุบัน'
              : 'เพิ่มแผนกใหม่สำหรับจัดกลุ่มสมาชิกใน workspace'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Department name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Engineering"
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save department'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDepartmentDialog({
  department,
}: {
  department: DepartmentRecord
}) {
  const queryClient = useQueryClient()
  const deleteFn = useServerFn(deleteDepartment)
  const mutation = useMutation({
    mutationFn: () => deleteFn({ data: { id: department.id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments })
      void queryClient.invalidateQueries({ queryKey: queryKeys.users })
      toast.success('ลบแผนกแล้ว')
    },
    onError: (error) => {
      toast.error('ลบแผนกไม่สำเร็จ', {
        description: getErrorMessage(error, 'ลองใหม่อีกครั้ง'),
      })
    },
  })

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${department.name}`}
          disabled={mutation.isPending}
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {department.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            สมาชิก {formatCount(department.memberCount)}{' '}
            คนจะถูกยกเลิกการสังกัดแผนก แต่บัญชีผู้ใช้จะไม่ถูกลบ
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Deleting…' : 'Delete department'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function RolesPanel({
  users,
  roles,
  roleCounts,
  isLoading,
  isError,
  rbac,
  isRbacLoading,
  isRbacError,
}: {
  users: UserRecord[]
  roles: AccessRoleRecord[]
  roleCounts: Record<string, number>
  isLoading: boolean
  isError: boolean
  rbac?: RbacMatrixRecord
  isRbacLoading: boolean
  isRbacError: boolean
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <h2 className="font-semibold">Roles</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              สร้าง role เพิ่มได้ แล้วค่อยกำหนด permission ใน matrix ด้านล่าง
            </p>
          </div>
          <RoleEditorDialog />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {roles.map((role) => {
            const detail = isBuiltInRole(role.key)
              ? ROLE_DETAILS[role.key]
              : undefined
            const Icon = detail?.icon ?? KeyRound
            return (
              <article
                key={role.key}
                className="group rounded-xl border bg-card p-5 shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <Badge variant="secondary" className="tabular-nums">
                    {isLoading
                      ? '…'
                      : `${formatCount(roleCounts[role.key] ?? 0)} members`}
                  </Badge>
                </div>
                <div className="mt-5">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {role.isSystem ? 'Built-in role' : 'Custom role'}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{role.label}</h2>
                  <p className="mt-1.5 min-h-12 text-sm leading-6 text-muted-foreground">
                    {role.description || detail?.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-xs text-muted-foreground">
                    {role.isSystem ? 'Protected role' : 'Editable role'}
                  </span>
                  {!role.isSystem && (
                    <div className="flex items-center gap-1">
                      <RoleEditorDialog role={role} />
                      <DeleteRoleButton role={role} />
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <PermissionMatrix
        matrix={rbac}
        roleCounts={roleCounts}
        isLoading={isRbacLoading}
        isError={isRbacError}
      />

      <RoleAssignments
        users={users}
        roles={roles}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  )
}

function RoleEditorDialog({ role }: { role?: AccessRoleRecord }) {
  const queryClient = useQueryClient()
  const createFn = useServerFn(createRole)
  const updateFn = useServerFn(updateRole)
  const [open, setOpen] = useState(false)
  const form = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleInputSchema),
    defaultValues: {
      label: role?.label ?? '',
      description: role?.description ?? '',
    },
  })
  const mutation = useMutation({
    mutationFn: (values: CreateRoleInput) =>
      role
        ? updateFn({ data: { key: role.key, ...values } })
        : createFn({ data: values }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles })
      void queryClient.invalidateQueries({ queryKey: queryKeys.rbac })
      setOpen(false)
      form.reset()
      toast.success(role ? 'อัปเดต role แล้ว' : 'สร้าง role แล้ว')
    },
    onError: (error) => {
      form.setError('root', {
        message: getErrorMessage(error, 'ลองใหม่อีกครั้ง'),
      })
      toast.error(role ? 'อัปเดต role ไม่สำเร็จ' : 'สร้าง role ไม่สำเร็จ', {
        description: getErrorMessage(error, 'ลองใหม่อีกครั้ง'),
      })
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      form.reset({
        label: role?.label ?? '',
        description: role?.description ?? '',
      })
      mutation.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {role ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${role.label}`}
          >
            <Edit3 className="size-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="size-4" />
            Add role
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role ? 'Edit role' : 'Add custom role'}</DialogTitle>
          <DialogDescription>
            {role
              ? 'อัปเดตชื่อและคำอธิบายของ role นี้'
              : 'สร้าง role ใหม่ แล้วกำหนด permission ต่อใน matrix'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="เช่น Project lead" />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ขอบเขตงานของ role นี้" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteRoleButton({ role }: { role: AccessRoleRecord }) {
  const queryClient = useQueryClient()
  const deleteFn = useServerFn(deleteRole)
  const mutation = useMutation({
    mutationFn: () => deleteFn({ data: { key: role.key } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles })
      void queryClient.invalidateQueries({ queryKey: queryKeys.rbac })
      toast.success('ลบ role แล้ว')
    },
    onError: (error) =>
      toast.error('ลบ role ไม่สำเร็จ', {
        description: getErrorMessage(error, 'ลองใหม่อีกครั้ง'),
      }),
  })

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${role.label}`}
          disabled={mutation.isPending || role.memberCount > 0}
          title={
            role.memberCount > 0 ? 'ย้ายสมาชิกออกจาก role ก่อนลบ' : undefined
          }
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {role.label}?</AlertDialogTitle>
          <AlertDialogDescription>
            role นี้จะถูกลบและไม่สามารถกู้คืนได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => mutation.mutate()}
          >
            Delete role
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function PermissionEditorDialog() {
  const queryClient = useQueryClient()
  const createFn = useServerFn(createPermission)
  const [open, setOpen] = useState(false)
  const form = useForm<CreatePermissionInput>({
    resolver: zodResolver(createPermissionInputSchema),
    defaultValues: {
      key: '',
      group: 'Workspace',
      label: '',
      description: '',
    },
  })
  const mutation = useMutation({
    mutationFn: (values: CreatePermissionInput) => createFn({ data: values }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rbac })
      setOpen(false)
      form.reset()
      toast.success('เพิ่ม permission แล้ว')
    },
    onError: (error) => {
      form.setError('root', {
        message: getErrorMessage(error, 'ลองใหม่อีกครั้ง'),
      })
      toast.error('เพิ่ม permission ไม่สำเร็จ', {
        description: getErrorMessage(error, 'ลองใหม่อีกครั้ง'),
      })
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      form.reset({
        key: '',
        group: 'Workspace',
        label: '',
        description: '',
      })
      mutation.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Plus className="size-4" />
          Add permission
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add permission</DialogTitle>
          <DialogDescription>
            เพิ่มแถว permission ใหม่ใน catalog เพื่อกำหนดสิทธิ์แยกตาม role
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission key</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="เช่น invoices.view" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="เช่น Billing" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="เช่น View invoices" />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ขอบเขตของ permission นี้" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save permission'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

type MatrixFormValues = {
  permissions: Record<string, Record<string, boolean>>
}

function buildMatrixValues(matrix: RbacMatrixRecord): MatrixFormValues {
  return {
    permissions: Object.fromEntries(
      matrix.permissions.map((permission, index) => [
        String(index),
        permission.enabled,
      ]),
    ),
  }
}

function PermissionMatrix({
  matrix,
  roleCounts,
  isLoading,
  isError,
}: {
  matrix?: RbacMatrixRecord
  roleCounts: Record<string, number>
  isLoading: boolean
  isError: boolean
}) {
  const queryClient = useQueryClient()
  const updateFn = useServerFn(updateRolePermissions)
  const form = useForm<MatrixFormValues>({
    defaultValues: matrix ? buildMatrixValues(matrix) : undefined,
  })
  const updateMutation = useMutation({
    mutationFn: (
      updates: Array<{
        role: string
        permission: string
        enabled: boolean
      }>,
    ) => updateFn({ data: { updates } }),
    onSuccess: (result) => {
      form.reset(form.getValues())
      void queryClient.invalidateQueries({ queryKey: queryKeys.rbac })
      toast.success('บันทึก RBAC แล้ว', {
        description: `อัปเดต ${result.updated} permission${result.updated === 1 ? '' : 's'}`,
      })
    },
    onError: (error) => {
      toast.error('บันทึก RBAC ไม่สำเร็จ', {
        description: getErrorMessage(error, 'ลองใหม่อีกครั้ง'),
      })
    },
  })

  useEffect(() => {
    if (matrix && !updateMutation.isPending) {
      form.reset(buildMatrixValues(matrix))
    }
  }, [form, matrix, updateMutation.isPending])

  const groupedPermissions = useMemo(() => {
    if (!matrix) return []
    const groups = new Map<string, RbacMatrixRecord['permissions']>()
    for (const permission of matrix.permissions) {
      const group = groups.get(permission.group) ?? []
      group.push(permission)
      groups.set(permission.group, group)
    }
    return Array.from(groups.entries())
  }, [matrix])

  function resetChanges() {
    if (matrix) form.reset(buildMatrixValues(matrix))
  }

  function saveChanges(values: MatrixFormValues) {
    if (!matrix) return
    const updates = matrix.permissions.flatMap((permission, permissionIndex) =>
      matrix.roles.flatMap((role) => {
        const previous = permission.enabled[role.key] ?? false
        const next =
          values.permissions[String(permissionIndex)]?.[role.key] ?? previous
        return next === previous
          ? []
          : [{ role: role.key, permission: permission.key, enabled: next }]
      }),
    )
    if (updates.length === 0) {
      toast.message('ยังไม่มีการเปลี่ยนแปลง')
      return
    }
    updateMutation.mutate(updates)
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">RBAC permission matrix</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            กำหนดสิทธิ์ระดับ role จากจุดเดียว การเปลี่ยนแปลงจะถูกตรวจซ้ำที่
            server และไม่สามารถปิดสิทธิ์ดูแล access ของ Admin ได้
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <PermissionEditorDialog />
          <Button
            type="button"
            variant="outline"
            onClick={resetChanges}
            disabled={!form.formState.isDirty || updateMutation.isPending}
            className="gap-2"
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button
            type="button"
            onClick={() => void form.handleSubmit(saveChanges)()}
            disabled={!form.formState.isDirty || updateMutation.isPending}
            className="gap-2"
          >
            <Save className="size-4" />
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {isError ? (
        <DataState
          title="Could not load RBAC permissions"
          description="ลอง refresh หน้าอีกครั้งเพื่อโหลด permission matrix ใหม่"
        />
      ) : isLoading || !matrix ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(saveChanges)}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-205 text-sm">
                <thead>
                  <tr className="border-b bg-muted/20 text-left">
                    <th className="min-w-90 px-5 py-3 text-xs font-medium text-muted-foreground">
                      Permission
                    </th>
                    {matrix.roles.map((role) => (
                      <th
                        key={role.key}
                        className="w-32 px-4 py-3 text-center text-xs font-medium"
                      >
                        <span className="block">{role.label}</span>
                        <span className="mt-0.5 block font-normal text-muted-foreground">
                          {formatCount(roleCounts[role.key] ?? 0)} members
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedPermissions.map(([group, permissions]) => (
                    <Fragment key={group}>
                      <tr className="border-b bg-muted/10">
                        <th
                          colSpan={matrix.roles.length + 1}
                          className="px-5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          {group}
                        </th>
                      </tr>
                      {permissions.map((permission) => (
                        <PermissionMatrixRow
                          key={permission.key}
                          control={form.control}
                          permission={permission}
                          permissionIndex={matrix.permissions.indexOf(
                            permission,
                          )}
                          roles={matrix.roles}
                        />
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 border-t bg-muted/10 px-5 py-3 text-xs text-muted-foreground">
              <LockKeyhole className="size-3.5" />
              <span>
                Protected admin controls stay enabled to prevent lockout.
              </span>
            </div>
          </form>
        </Form>
      )}
    </section>
  )
}

function PermissionMatrixRow({
  control,
  permission,
  permissionIndex,
  roles,
}: {
  control: ReturnType<typeof useForm<MatrixFormValues>>['control']
  permission: RbacMatrixRecord['permissions'][number]
  permissionIndex: number
  roles: RbacMatrixRecord['roles']
}) {
  return (
    <tr className="border-b last:border-0 transition-colors hover:bg-muted/20">
      <td className="px-5 py-3.5">
        <p className="font-medium">{permission.label}</p>
        <p className="mt-0.5 max-w-xl text-xs leading-5 text-muted-foreground">
          {permission.description}
        </p>
      </td>
      {roles.map((role) => (
        <td key={role.key} className="px-4 py-3.5 text-center align-middle">
          <FormField
            control={control}
            name={`permissions.${permissionIndex}.${role.key}` as never}
            render={({ field }) => {
              const protectedCell =
                role.key === Role.Admin && permission.protectedForAdmin
              return (
                <FormItem className="flex justify-center">
                  <FormControl>
                    <Checkbox
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                      disabled={protectedCell}
                      aria-label={`${permission.label} for ${role.label}`}
                      title={
                        protectedCell ? 'Protected admin permission' : undefined
                      }
                    />
                  </FormControl>
                </FormItem>
              )
            }}
          />
        </td>
      ))}
    </tr>
  )
}

function RoleAssignments({
  users,
  roles,
  isLoading,
  isError,
}: {
  users: UserRecord[]
  roles: AccessRoleRecord[]
  isLoading: boolean
  isError: boolean
}) {
  const queryClient = useQueryClient()
  const updateFn = useServerFn(updateUser)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const mutation = useMutation({
    mutationFn: (values: { id: string; role: string }) =>
      updateFn({ data: values }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users })
      toast.success('อัปเดต role แล้ว')
    },
    onError: (error) => {
      toast.error('อัปเดต role ไม่สำเร็จ', {
        description: getErrorMessage(error, 'ลองใหม่อีกครั้ง'),
      })
    },
  })

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return users
    return users.filter((user) =>
      [user.name, user.email, user.departmentName ?? '', user.role]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  }, [search, users])
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">Role assignments</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            เปลี่ยน role ของสมาชิกได้ทันทีจากตารางนี้
            โดยสิทธิ์หลักยังคงมาจากระบบกลาง
          </p>
        </div>
        <Button variant="outline" asChild className="w-fit gap-2">
          <Link to="/users">
            Open user list
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
        <div className="relative min-w-55 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Filter role assignments"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Filter members..."
            className="h-10 pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {formatCount(filteredUsers.length)} members
        </span>
      </div>

      {isError ? (
        <DataState
          title="Could not load role assignments"
          description="ลอง refresh หน้าอีกครั้งเพื่อโหลดข้อมูลใหม่"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-sm">
              <thead>
                <tr className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="w-52 px-5 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && (
                  <tr>
                    <td colSpan={3} className="px-5 py-5">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                )}
                {!isLoading && visibleUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      {search ? 'No members found.' : 'ยังไม่มีสมาชิก'}
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  visibleUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-[11px] font-semibold">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {user.departmentName ?? 'No department'}
                      </td>
                      <td className="px-5 py-3.5">
                        <Select
                          value={user.role}
                          disabled={
                            mutation.isPending &&
                            mutation.variables.id === user.id
                          }
                          onValueChange={(value) =>
                            mutation.mutate({
                              id: user.id,
                              role: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.key} value={role.key}>
                                <span className="flex items-center gap-2">
                                  {role.label}
                                  <span className="text-xs text-muted-foreground">
                                    {role.isSystem
                                      ? 'Built-in role'
                                      : 'Custom role'}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            isPending={isLoading}
            onPageChange={setPage}
            summary={<span>{filteredUsers.length} members</span>}
            pageLabel={`Page ${currentPage} of ${totalPages}`}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 20]}
            onPageSizeChange={(value) => {
              setPageSize(value)
              setPage(1)
            }}
            className="border-t px-5 py-3 text-xs text-muted-foreground"
          />
        </>
      )}
    </section>
  )
}

function DataState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <CircleHelp className="size-5" />
      </div>
      <h2 className="mt-4 font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
