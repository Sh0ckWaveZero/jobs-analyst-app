import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bell, KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '@/features/auth/auth-client'
import { queryKeys } from '@/lib/query-keys'
import { Role } from '@/lib/roles'
import type { UserRole } from '@/lib/roles'
import { listDepartments } from '@/features/users/users.functions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'

const ROLE_LABELS: Record<UserRole, string> = {
  [Role.Admin]: 'Admin — จัดการได้ทุกอย่าง',
  [Role.Manager]: 'Manager — จัดการโปรเจกต์ที่เป็นเจ้าของ + ดูชั่วโมงทีม',
  [Role.Member]: 'Member — บันทึกชั่วโมงและดูข้อมูลของตัวเอง',
}

const nameSchema = z.object({
  name: z.string().trim().min(1, 'กรอกชื่อ').max(80),
})

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'กรอกรหัสผ่านปัจจุบัน'),
    newPassword: z.string().min(8, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'รหัสผ่านใหม่ไม่ตรงกัน',
    path: ['confirmPassword'],
  })

type ChangePasswordValues = z.infer<typeof changePasswordSchema>

type SettingsUser = {
  name: string
  email: string
  role?: UserRole
  departmentId?: number | string | null
  createdAt?: string | Date
}

export type SettingsSection =
  'profile' | 'security' | 'notifications' | 'access'

const SETTINGS_SECTIONS: Array<{
  tab: Exclude<SettingsSection, 'access'>
  label: string
  icon: LucideIcon
}> = [
  { tab: 'profile', label: 'โปรไฟล์', icon: UserRound },
  { tab: 'security', label: 'ความปลอดภัย', icon: KeyRound },
  { tab: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
]

const SETTINGS_CONTENT: Record<
  Exclude<SettingsSection, 'access'>,
  { title: string; description: string }
> = {
  profile: {
    title: 'โปรไฟล์',
    description: 'อัปเดตข้อมูลโปรไฟล์ของคุณ',
  },
  security: {
    title: 'ความปลอดภัย',
    description: 'เปลี่ยนรหัสผ่านของคุณ',
  },
  notifications: {
    title: 'การแจ้งเตือน',
    description: 'จัดการการแจ้งเตือนที่เกี่ยวข้องกับงานของคุณ',
  },
}

// format วันที่เป็น helper ระดับโมดูล — กันค่าต่าง timezone SSR/client
function formatJoinedDate(date: Date | string) {
  return new Date(date).toLocaleDateString('th-TH', { dateStyle: 'long' })
}

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

export function SettingsNav({
  section,
  isAdmin = false,
}: {
  section: SettingsSection
  isAdmin?: boolean
}) {
  const sections: Array<{
    tab: SettingsSection
    label: string
    icon: LucideIcon
  }> = isAdmin
    ? [
        ...SETTINGS_SECTIONS,
        { tab: 'access', label: 'Access management', icon: ShieldCheck },
      ]
    : SETTINGS_SECTIONS

  return (
    <nav
      aria-label="การตั้งค่า"
      className="flex gap-1 overflow-x-auto lg:w-52 lg:shrink-0 lg:flex-col"
    >
      {sections.map(({ tab, label, icon: Icon }) => {
        const active = section === tab
        return (
          <Link
            key={tab}
            to="/settings"
            search={
              tab === 'access'
                ? { tab: 'access', section: 'departments' }
                : { tab, section: 'departments' }
            }
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 whitespace-nowrap px-2.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'rounded-lg bg-muted text-foreground'
                : 'rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function SettingsBreadcrumb({
  current,
  tab,
}: {
  current: string
  tab: SettingsSection
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex items-center gap-2">
        <li>
          <Link
            to="/settings"
            search={{ tab: 'profile', section: 'departments' }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Settings
          </Link>
        </li>
        <li aria-hidden className="text-muted-foreground/50">
          /
        </li>
        <li>
          <Link
            to="/settings"
            search={
              tab === 'access'
                ? { tab: 'access', section: 'departments' }
                : { tab, section: 'departments' }
            }
            aria-current="page"
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            {current}
          </Link>
        </li>
      </ol>
    </nav>
  )
}

export function ProfileSection({
  user,
  isPending,
  departmentName,
  nameForm,
  nameSaving,
  onNameSubmit,
}: {
  user: SettingsUser | undefined
  isPending: boolean
  departmentName?: string
  nameForm: UseFormReturn<{ name: string }>
  nameSaving: boolean
  onNameSubmit: (values: { name: string }) => Promise<void>
}) {
  return (
    <section className="pt-1">
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : user ? (
        <>
          <div className="flex items-start gap-4">
            <Avatar className="size-12">
              <AvatarFallback className="text-sm font-semibold">
                {user.name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{user.name}</p>
                {user.role && (
                  <Badge variant="secondary" className="uppercase">
                    {user.role}
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {user.role ? ROLE_LABELS[user.role] : ''}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                แผนก: {departmentName ?? 'ไม่สังกัดแผนก'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                เข้าร่วมเมื่อ{' '}
                {user.createdAt ? formatJoinedDate(user.createdAt) : ''}
              </p>
            </div>
          </div>
          <Form {...nameForm}>
            <form
              onSubmit={nameForm.handleSubmit(onNameSubmit)}
              className="mt-6 flex flex-col gap-4"
              noValidate
            >
              <FormField
                control={nameForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อที่แสดง</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-fit" disabled={nameSaving}>
                บันทึกชื่อ
              </Button>
            </form>
          </Form>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">ไม่พบ session</p>
      )}
    </section>
  )
}

export function SecuritySection({
  passwordForm,
  pwSaving,
  onPasswordSubmit,
}: {
  passwordForm: UseFormReturn<ChangePasswordValues>
  pwSaving: boolean
  onPasswordSubmit: (values: ChangePasswordValues) => Promise<void>
}) {
  const { shakingFields, trigger: triggerErrorShake } = useErrorShake()

  return (
    <section className="pt-1">
      <Form {...passwordForm}>
        <form
          onSubmit={passwordForm.handleSubmit(
            onPasswordSubmit,
            triggerErrorShake,
          )}
          className="flex flex-col gap-4"
          noValidate
        >
          <FormField
            control={passwordForm.control}
            name="currentPassword"
            render={({ field, fieldState }) => (
              <FormItem className={errorWrapClass(!!fieldState.error)}>
                <FormLabel>รหัสผ่านปัจจุบัน</FormLabel>
                <FormControl>
                  <PasswordInput
                    className={errorInputClass(
                      'currentPassword',
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
          <FormField
            control={passwordForm.control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <FormItem className={errorWrapClass(!!fieldState.error)}>
                <FormLabel>รหัสผ่านใหม่</FormLabel>
                <FormControl>
                  <PasswordInput
                    className={errorInputClass(
                      'newPassword',
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
          <FormField
            control={passwordForm.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <FormItem className={errorWrapClass(!!fieldState.error)}>
                <FormLabel>ยืนยันรหัสผ่านใหม่</FormLabel>
                <FormControl>
                  <PasswordInput
                    className={errorInputClass(
                      'confirmPassword',
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
          <Button type="submit" className="w-fit" disabled={pwSaving}>
            เปลี่ยนรหัสผ่าน
          </Button>
        </form>
      </Form>
    </section>
  )
}

export function NotificationsSection() {
  return (
    <section className="pt-1">
      <p className="text-sm text-muted-foreground">
        ยังไม่มีการแจ้งเตือน — จะแจ้งเมื่อมีการมอบหมาย issue ให้คุณ
      </p>
    </section>
  )
}

export function SettingsPage({
  section = 'profile',
}: {
  section?: Exclude<SettingsSection, 'access'>
}) {
  const { data: session, isPending } = authClient.useSession()
  const departments = useServerFn(listDepartments)
  const qDepartments = useQuery({
    queryKey: queryKeys.departments,
    queryFn: () => departments(),
  })
  const u = session?.user as SettingsUser | undefined
  const departmentName = qDepartments.data?.find(
    (d) => String(d.id) === String(u?.departmentId ?? ''),
  )?.name

  const nameForm = useForm<{ name: string }>({
    resolver: zodResolver(nameSchema),
    values: { name: u?.name ?? '' },
  })
  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })
  const [nameSaving, setNameSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  async function onNameSubmit(values: { name: string }) {
    setNameSaving(true)
    try {
      const res = await authClient.updateUser({ name: values.name })
      if (res.error) {
        toast.error('แก้ไขโปรไฟล์ไม่สำเร็จ', {
          description: res.error.message ?? undefined,
        })
        return
      }
      toast.success('แก้ไขโปรไฟล์แล้ว')
    } finally {
      setNameSaving(false)
    }
  }

  async function onPasswordSubmit(values: ChangePasswordValues) {
    setPwSaving(true)
    try {
      const res = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      })
      if (res.error) {
        toast.error('เปลี่ยนรหัสผ่านไม่สำเร็จ', {
          description: res.error.message ?? undefined,
        })
        return
      }
      passwordForm.reset()
      toast.success('เปลี่ยนรหัสผ่านแล้ว')
    } finally {
      setPwSaving(false)
    }
  }

  const content = SETTINGS_CONTENT[section]
  return (
    <div className="space-y-6">
      <SettingsBreadcrumb current={content.title} tab={section} />
      <div className="flex flex-col gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {content.title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {content.description}
          </p>
        </div>
      </div>

      {section === 'security' ? (
        <SecuritySection
          passwordForm={passwordForm}
          pwSaving={pwSaving}
          onPasswordSubmit={onPasswordSubmit}
        />
      ) : section === 'notifications' ? (
        <NotificationsSection />
      ) : (
        <ProfileSection
          user={u}
          isPending={isPending}
          departmentName={departmentName}
          nameForm={nameForm}
          nameSaving={nameSaving}
          onNameSubmit={onNameSubmit}
        />
      )}
    </div>
  )
}
