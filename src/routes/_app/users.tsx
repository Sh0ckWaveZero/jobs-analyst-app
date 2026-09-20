import { createFileRoute } from '@tanstack/react-router'

import { UsersPage } from '@/features/users/users-page'
import { getSession } from '@/features/auth/auth.functions'
import {
  listDepartments,
  listUsers,
} from '@/features/users/users.functions'

export const Route = createFileRoute('/_app/users')({
  // prefetch ขนาน: session วิ่งพร้อมกับข้อมูล —
  // users เฉพาะ admin (ต้องรู้ role จาก session ก่อน), departments ได้ทุก role
  loader: async ({ context: { queryClient } }) => {
    const sessionPromise = getSession()
    const [session] = await Promise.all([
      sessionPromise,
      sessionPromise.then((s): Promise<unknown> =>
        s?.user.role === 'admin'
          ? Promise.all([
              queryClient.ensureQueryData({
                queryKey: ['pm', 'users'],
                queryFn: () => listUsers(),
              }),
              queryClient.ensureQueryData({
                queryKey: ['pm', 'departments'],
                queryFn: () => listDepartments(),
              }),
            ])
          : queryClient.ensureQueryData({
              queryKey: ['pm', 'departments'],
              queryFn: () => listDepartments(),
            }),
      ),
    ])
    return session
  },
  component: UsersPage,
})
