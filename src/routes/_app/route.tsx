import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppSidebar } from '@/components/layout/app-sidebar'
import {
  CommandMenu,
  NotificationsMenu,
} from '@/components/layout/command-menu'
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

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="!h-4" />
          <span className="text-sm font-semibold tracking-tight">
            Jobs Analysis
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
