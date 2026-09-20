import { createFileRoute } from '@tanstack/react-router'

import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { getSession } from '@/features/auth/auth.functions'
import {
  getDashboardCounts,
  listIssues,
} from '@/features/issues/issues.functions'
import {
  getMyWeekMinutes,
  getRunningEntry,
  getWorkHourAnalysis,
  listMyEntries,
} from '@/features/time-entries/time-entries.functions'
import { getProjects } from '@/features/projects/projects.functions'

export const Route = createFileRoute('/_app/')({
  // prefetch ข้อมูล dashboard ให้ SSR มี data พร้อมตอน render
  // queryKey ต้องตรงกับที่ dashboard-page.tsx ใช้ ถึงจะ hydrate ติดไปได้
  loader: async ({ context: { queryClient } }) => {
    const session = await getSession()

    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['pm', 'counts'],
        queryFn: () => getDashboardCounts(),
      }),
      queryClient.ensureQueryData({
        queryKey: ['pm', 'week'],
        queryFn: () => getMyWeekMinutes(),
      }),
      queryClient.ensureQueryData({
        queryKey: ['pm', 'analysis', '2W'],
        queryFn: () => getWorkHourAnalysis({ data: { range: '2W' } }),
      }),
      queryClient.ensureQueryData({
        queryKey: ['pm', 'running'],
        queryFn: () => getRunningEntry(),
      }),
      queryClient.ensureQueryData({
        queryKey: ['pm', 'projects'],
        queryFn: () => getProjects(),
      }),
      queryClient.ensureQueryData({
        queryKey: ['pm', 'my-entries'],
        queryFn: () => listMyEntries({ data: {} }),
      }),
      ...(session
        ? [
            queryClient.ensureQueryData({
              queryKey: ['pm', 'issues', 'mine'],
              queryFn: () =>
                listIssues({
                  data: { assigneeId: session.user.id, limit: 8 },
                }),
            }),
          ]
        : []),
    ])
  },
  component: DashboardPage,
})
