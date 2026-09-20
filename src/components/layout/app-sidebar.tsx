import { useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { queryKeys } from '@/lib/query-keys'
import { Role } from '@/lib/roles'
import {
  Activity,
  Archive,
  Bell,
  Briefcase,
  ChevronRight,
  ChevronsUpDown,
  FileChartColumn,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { authClient } from '@/features/auth/auth-client'
import {
  getArchivedProjects,
  getProjects,
} from '@/features/projects/projects.functions'

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const overviewGroup: { label: string; items: NavItem[] } = {
  label: 'Overview',
  items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/reports', label: 'Reports', icon: FileChartColumn },
  ],
}

const workspaceGroup: { label: string; items: NavItem[] } = {
  label: 'Workspace',
  items: [{ to: '/users', label: 'Users', icon: UsersRound, adminOnly: true }],
}

export function AppSidebar() {
  const { pathname, search } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      search: s.location.search,
    }),
  })
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user.role === Role.Admin
  const settingsTab =
    pathname.startsWith('/access') || search.tab === 'access'
      ? 'access'
      : search.tab === 'profile' ||
          search.tab === 'security' ||
          search.tab === 'notifications'
        ? search.tab
        : undefined

  const name = session?.user.name ?? '…'
  const email = session?.user.email ?? ''
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-3">
        <div className="flex items-center gap-3 rounded-lg px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Activity className="size-4" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold tracking-tight">
              Jobs Analysis
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/55">
              Work hour workspace
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-3">
        <SidebarGroup className="px-1 py-2">
          <SidebarGroupLabel className="h-7 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
            {overviewGroup.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewGroup.items.map((item) => (
                <NavItemButton
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.to, pathname)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <ProjectsGroup pathname={pathname} />

        <SettingsGroup
          pathname={pathname}
          activeTab={settingsTab}
          isAdmin={isAdmin}
        />

        <SidebarGroup className="px-1 py-2">
          <SidebarGroupLabel className="h-7 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
            {workspaceGroup.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceGroup.items
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => (
                  <NavItemButton
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    active={isActive(item.to, pathname)}
                  />
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 px-2 py-3">
        <NavUser
          user={{
            name,
            email,
            initials,
            role: session?.user.role ?? Role.Member,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}

function isActive(to: string, pathname: string) {
  if (to === '/') return pathname === '/'
  if (to === '/projects') return pathname.startsWith('/projects')
  if (to === '/users') return pathname.startsWith('/users')
  return pathname.startsWith(to)
}

function NavItemButton({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={label}
        className="h-9 rounded-lg px-2.5 text-[13px]"
      >
        <Link to={to} activeOptions={{ exact: to === '/' }}>
          <Icon />
          <span>{label}</span>
          <ChevronRight className="ml-auto size-3.5 opacity-35" />
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/** กลุ่ม Projects: Active Projects (ยุบ/ขยายรายชื่อโปรเจกต์) + Archived */
/** กลุ่ม Settings: โปรไฟล์ / ความปลอดภัย / การแจ้งเตือน (ยุบ/ขยายได้) */
function SettingsGroup({
  pathname,
  activeTab,
  isAdmin,
}: {
  pathname: string
  activeTab?: 'profile' | 'security' | 'notifications' | 'access'
  isAdmin: boolean
}) {
  const [open, setOpen] = useState(true)
  const subs: Array<{
    to: '/settings'
    label: string
    tab: 'profile' | 'security' | 'notifications' | 'access'
    icon: typeof UserRound
  }> = [
    { to: '/settings', label: 'โปรไฟล์', tab: 'profile', icon: UserRound },
    {
      to: '/settings',
      label: 'ความปลอดภัย',
      tab: 'security',
      icon: KeyRound,
    },
    {
      to: '/settings',
      label: 'การแจ้งเตือน',
      tab: 'notifications',
      icon: Bell,
    },
  ]
  if (isAdmin) {
    subs.push({
      to: '/settings',
      label: 'Access management',
      tab: 'access',
      icon: ShieldCheck,
    })
  }

  const settingsActive =
    pathname.startsWith('/settings') || pathname.startsWith('/access')

  return (
    <SidebarGroup className="px-1 py-2">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              isActive={settingsActive}
              className="h-9 rounded-lg px-2.5 text-[13px]"
            >
              <Link
                to="/settings"
                search={{ tab: 'profile', section: 'departments' }}
              >
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuAction
              onClick={() => setOpen((v) => !v)}
              className="size-7"
            >
              <ChevronRight
                className={`transition-transform ${open ? 'rotate-90' : ''}`}
              />
            </SidebarMenuAction>
            {open && (
              <SidebarMenuSub>
                {subs.map(({ icon: Icon, ...s }) => (
                  <SidebarMenuSubItem key={s.label}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={activeTab === s.tab}
                    >
                      <Link
                        to={s.to}
                        search={
                          s.tab === 'access'
                            ? { tab: 'access', section: 'departments' }
                            : { tab: s.tab, section: 'departments' }
                        }
                      >
                        <Icon />
                        {s.label}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function ProjectsGroup({ pathname }: { pathname: string }) {
  const projectsFn = useServerFn(getProjects)
  const archivedFn = useServerFn(getArchivedProjects)
  const qProjects = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => projectsFn(),
  })
  const qArchived = useQuery({
    queryKey: queryKeys.projectsArchived,
    queryFn: () => archivedFn(),
  })

  const [activeOpen, setActiveOpen] = useState(true)
  const [archivedOpen, setArchivedOpen] = useState(true)
  const archived = qArchived.data ?? []

  return (
    <SidebarGroup className="px-1 py-2">
      <SidebarGroupLabel className="h-7 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
        Projects
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Active Projects"
              isActive={pathname.startsWith('/projects')}
              className="h-9 rounded-lg px-2.5 text-[13px]"
            >
              <Link to="/projects">
                <Briefcase />
                <span>Active Projects</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuAction
              onClick={() => setActiveOpen((v) => !v)}
              className="size-7"
            >
              <ChevronRight
                className={`transition-transform ${activeOpen ? 'rotate-90' : ''}`}
              />
            </SidebarMenuAction>
            {activeOpen && (
              <SidebarMenuSub>
                {(qProjects.data?.projects ?? []).map((p) => (
                  <SidebarMenuSubItem key={p.id}>
                    <SidebarMenuSubButton asChild>
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: String(p.id) }}
                        activeProps={{ 'data-active': true }}
                      >
                        {p.name}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
                {(qProjects.data?.projects.length ?? 0) === 0 && (
                  <SidebarMenuSubItem>
                    <span className="px-2 py-1 text-xs text-sidebar-foreground/50">
                      ไม่มีโปรเจกต์
                    </span>
                  </SidebarMenuSubItem>
                )}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>

          {archived.length > 0 && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Archived"
                className="h-9 rounded-lg px-2.5 text-[13px]"
                onClick={() => setArchivedOpen((v) => !v)}
              >
                <Archive />
                <span>Archived</span>
              </SidebarMenuButton>
              <SidebarMenuAction
                onClick={() => setArchivedOpen((v) => !v)}
                className="size-7"
              >
                <ChevronRight
                  className={`transition-transform ${archivedOpen ? 'rotate-90' : ''}`}
                />
              </SidebarMenuAction>
              {archivedOpen && (
                <SidebarMenuSub>
                  {archived.map((p) => (
                    <SidebarMenuSubItem key={p.id}>
                      <SidebarMenuSubButton asChild>
                        <Link
                          to="/projects/$projectId"
                          params={{ projectId: String(p.id) }}
                        >
                          {p.name}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function NavUser({
  user: u,
}: {
  user: { name: string; email: string; initials: string; role: string }
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  async function signOut() {
    await authClient.signOut()
    qc.clear()
    await navigate({ to: '/login' })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="rounded-lg px-2">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-primary/12 text-xs font-semibold text-sidebar-primary">
                  {u.initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{u.name}</span>
                <span className="truncate text-[11px] text-sidebar-foreground/55">
                  {u.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-55 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="flex items-center gap-2 p-0">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {u.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{u.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {u.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to="/settings"
                search={{ tab: 'profile', section: 'departments' }}
              >
                <UserRound />
                Profile
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {u.role}
                </span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
