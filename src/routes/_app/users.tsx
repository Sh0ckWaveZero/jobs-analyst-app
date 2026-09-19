import { createFileRoute } from '@tanstack/react-router'

import { UsersPage } from '@/features/users/users-page'
import { getSession } from '@/features/auth/auth.functions'
import {
  listDepartments,
  listUsers,
} from '@/features/users/users.functions'

export const Route = createFileRoute('/_app/users')({
  // prefetch เฉพาะ admin — คนอื่นเห็น Forbidden หน้า client-side อยู่แล้ว
  loader: async ({ context: { queryClient } }) => {
    const session = await getSession()
    if (session?.user.role !== 'admin') return

    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['pm', 'users'],
        queryFn: () => listUsers(),
      }),
      queryClient.ensureQueryData({
        queryKey: ['pm', 'departments'],
        queryFn: () => listDepartments(),
      }),
    ])
  },
  component: UsersPage,
})
