import { createFileRoute } from '@tanstack/react-router'

import { SettingsNav, SettingsPage } from '@/features/settings/settings-page'
import { AccessManagementPage } from '@/features/settings/access-management-page'
import type { AccessSection } from '@/features/settings/access-management-page'
import { RouteSkeleton } from '@/components/layout/route-skeleton'
import { queryKeys } from '@/lib/query-keys'
import { listDepartments } from '@/features/users/users.functions'
import { getSession } from '@/features/auth/auth.functions'
import { Role } from '@/lib/roles'

type SettingsTab = 'profile' | 'security' | 'notifications' | 'access'

// ?tab= → สลับ section ของ settings — ค่าอื่น fallback เป็น profile
function parseTab(tab: unknown): SettingsTab {
  return tab === 'security' || tab === 'notifications' || tab === 'access'
    ? tab
    : 'profile'
}

function parseAccessSection(section: unknown): AccessSection {
  return section === 'roles' || section === 'rbac' ? 'roles' : 'departments'
}

export const Route = createFileRoute('/_app/settings')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseTab(search.tab),
    section: parseAccessSection(search.section),
  }),
  loader: async ({ context: { queryClient } }) => {
    const [session] = await Promise.all([
      getSession(),
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.departments,
        queryFn: () => listDepartments(),
      }),
    ])
    return session
  },
  pendingComponent: RouteSkeleton,
  component: RouteComponent,
})

function RouteComponent() {
  const { tab, section } = Route.useSearch()
  const session = Route.useLoaderData()
  const isAdmin = session?.user.role === Role.Admin

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row lg:gap-10">
      <SettingsNav section={tab} isAdmin={isAdmin} />
      <div className="min-w-0 flex-1">
        {tab === 'access' ? (
          <AccessManagementPage section={section} isAdmin={isAdmin} embedded />
        ) : (
          <SettingsPage section={tab} />
        )}
      </div>
    </div>
  )
}
