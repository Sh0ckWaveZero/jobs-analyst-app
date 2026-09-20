import { createFileRoute } from '@tanstack/react-router'

import { UsersPage } from '@/features/users/users-page'
import { RouteSkeleton } from '@/components/layout/route-skeleton'
import { queryKeys } from '@/lib/query-keys'
import { Role } from '@/lib/roles'
import { getSession } from '@/features/auth/auth.functions'
import { listDepartments, listUsers } from '@/features/users/users.functions'
import { listRoles } from '@/features/settings/rbac.functions'

export const Route = createFileRoute('/_app/users')({
  // prefetch ขนาน: session วิ่งพร้อมกับข้อมูล —
  // users เฉพาะ admin (ต้องรู้ role จาก session ก่อน), departments ได้ทุก role
  loader: async ({ context: { queryClient } }) => {
    const sessionPromise = getSession()
    const [session] = await Promise.all([
      sessionPromise,
      sessionPromise.then((s): Promise<unknown> =>
        s?.user.role === Role.Admin
          ? Promise.all([
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
                queryKey: queryKeys.roles,
                queryFn: () => listRoles(),
              }),
            ])
          : queryClient.query({
              staleTime: 'static',
              queryKey: queryKeys.departments,
              queryFn: () => listDepartments(),
            }),
      ),
    ])
    return session
  },
  pendingComponent: RouteSkeleton,
  component: UsersPage,
})
