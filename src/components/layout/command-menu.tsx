import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import {
  Bell,
  Briefcase,
  CircleDot,
  FileChartColumn,
  KeyRound,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getProjects } from '@/features/projects/projects.functions'
import { listIssues } from '@/features/issues/issues.functions'
import { authClient } from '@/features/auth/auth-client'
import { queryKeys } from '@/lib/query-keys'
import { Role } from '@/lib/roles'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: LayoutDashboard },
  { to: '/reports', label: 'Reports', icon: FileChartColumn },
  { to: '/users', label: 'Users', icon: UsersRound },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

type SettingsSearchItem = {
  tab: 'profile' | 'security' | 'notifications' | 'access'
  label: string
  alias: string
  icon: LucideIcon
  adminOnly?: boolean
}

const SETTINGS_ITEMS: readonly SettingsSearchItem[] = [
  {
    tab: 'profile',
    label: 'โปรไฟล์',
    alias: 'Profile',
    icon: UserRound,
  },
  {
    tab: 'security',
    label: 'ความปลอดภัย',
    alias: 'Security',
    icon: KeyRound,
  },
  {
    tab: 'notifications',
    label: 'การแจ้งเตือน',
    alias: 'Notifications',
    icon: Bell,
  },
  {
    tab: 'access',
    label: 'Access management',
    alias: 'Departments and roles',
    icon: ShieldCheck,
    adminOnly: true,
  },
] as const

/** ⌘K / Ctrl+K — ค้นหาโปรเจกต์/issue จริง หรือกระโดดไปหน้าต่างๆ ในแอป */
export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const projectsFn = useServerFn(getProjects)
  const listIssuesFn = useServerFn(listIssues)

  // ดึงเฉพาะตอนเปิด dialog — ไม่ยิงทุกครั้งที่ header render
  const qProjects = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => projectsFn(),
    enabled: open,
  })
  const qIssues = useQuery({
    queryKey: queryKeys.commandMenuIssues,
    queryFn: () => listIssuesFn({ data: { limit: 200 } }),
    enabled: open,
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function goToPage(to: (typeof NAV_ITEMS)[number]['to']) {
    setOpen(false)
    void navigate({ to })
  }

  function goToProject(projectId: number) {
    setOpen(false)
    void navigate({
      to: '/projects/$projectId',
      params: { projectId: String(projectId) },
    })
  }

  function goToSettings(tab: (typeof SETTINGS_ITEMS)[number]['tab']) {
    setOpen(false)
    void navigate({
      to: '/settings',
      search: { tab, section: 'departments' },
    })
  }

  const projects = qProjects.data?.projects ?? []
  const issues = qIssues.data ?? []
  const settingsItems = SETTINGS_ITEMS.filter(
    (item) => !item.adminOnly || session?.user.role === Role.Admin,
  )

  return (
    <>
      <Button
        variant="outline"
        className="h-8 w-56 justify-between px-3 text-sm font-normal text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" />
          Search...
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span>⌘</span>K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        showCloseButton={false}
      >
        <CommandInput
          clearable
          placeholder="ค้นหา issue, โปรเจกต์ หรือไปที่หน้า…"
        />
        <CommandList>
          <CommandEmpty>ไม่พบผลลัพธ์</CommandEmpty>
          <CommandGroup heading="Pages">
            {NAV_ITEMS.map((item) => (
              <CommandItem
                key={item.to}
                value={`page-${item.label}`}
                onSelect={() => goToPage(item.to)}
              >
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            {settingsItems.map((item) => (
              <CommandItem
                key={item.tab}
                value={`settings-${item.tab}-${item.label}`}
                keywords={[item.alias, 'Settings']}
                onSelect={() => goToSettings(item.tab)}
              >
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {projects.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projects">
                {projects.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`project-${p.key}-${p.name}`}
                    onSelect={() => goToProject(p.id)}
                  >
                    <Briefcase />
                    <span className="font-mono text-xs text-muted-foreground">
                      {p.key}
                    </span>
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {issues.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Issues">
                {issues.map((issue) => (
                  <CommandItem
                    key={issue.id}
                    value={`issue-${issue.key}-${issue.title}`}
                    onSelect={() => goToProject(issue.projectId)}
                  >
                    <CircleDot />
                    <span className="font-mono text-xs text-muted-foreground">
                      {issue.key}
                    </span>
                    {issue.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}

/** ยังไม่มีระบบแจ้งเตือนจริง — แสดง empty state ตรงๆ แทนการโชว์ตัวเลขปลอม */
export function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          disabled
          className="justify-center text-muted-foreground"
        >
          ยังไม่มีการแจ้งเตือน
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
