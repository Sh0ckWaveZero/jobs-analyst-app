import { createFileRoute } from '@tanstack/react-router'

import { RouteSkeleton } from '@/components/layout/route-skeleton'
import { getSession } from '@/features/auth/auth.functions'
import { AccessManagementPage } from '@/features/settings/access-management-page'
import { listRoles, listRbacMatrix } from '@/features/settings/rbac.functions'
import { listDepartments, listUsers } from '@/features/users/users.functions'
import { Role } from '@/lib/roles'
import { queryKeys } from '@/lib/query-keys'

type AccessSection = 'departments' | 'roles'

function parseSection(section: unknown): AccessSection {
  return section === 'rbac' || section === 'roles' ? 'roles' : 'departments'
}

export const Route = createFileRoute('/_app/access')({
  validateSearch: (search: Record<string, unknown>) => ({
    section: parseSection(search.section),
  }),
  loader: async ({ context: { queryClient } }) => {
    const session = await getSession()
    if (session?.user.role === Role.Admin) {
      await Promise.all([
        queryClient.query({
          staleTime: 'static',
          queryKey: queryKeys.users,
          queryFn: () => listUsers(),
        }),
        queryClient.query({
          staleTime: 'static',
          queryKey: queryKeys.departments,
          queryFn: () => listDepartments(),
        }),
        queryClient.query({
          staleTime: 'static',
          queryKey: queryKeys.rbac,
          queryFn: () => listRbacMatrix(),
        }),
        queryClient.query({
          staleTime: 'static',
          queryKey: queryKeys.roles,
          queryFn: () => listRoles(),
        }),
      ])
    }
    return session
  },
  pendingComponent: RouteSkeleton,
  component: RouteComponent,
})

function RouteComponent() {
  const { section } = Route.useSearch()
  const session = Route.useLoaderData()
  return (
    <AccessManagementPage
      section={section}
      isAdmin={session?.user.role === Role.Admin}
    />
  )
}
