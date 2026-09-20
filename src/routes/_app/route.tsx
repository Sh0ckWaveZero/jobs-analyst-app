import {
  Outlet,
  createFileRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'

import { AppSidebar } from '@/components/layout/app-sidebar'
import { CommandMenu, NotificationsMenu } from '@/components/layout/command-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { getSession } from '@/features/auth/auth.functions'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
})

const SECTION_TITLES: Array<[prefix: string, title: string]> = [
  ['/', 'Dashboard'],
  ['/projects', 'Projects'],
  ['/users', 'Users'],
  ['/reports', 'Reports'],
  ['/settings', 'Settings'],
]

function useSectionTitle() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return SECTION_TITLES.find(([prefix]) =>
    prefix === '/' ? pathname === '/' : pathname.startsWith(prefix),
  )?.[1]
}

function AppLayout() {
  const title = useSectionTitle()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="!h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <CommandMenu />
            <NotificationsMenu />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
