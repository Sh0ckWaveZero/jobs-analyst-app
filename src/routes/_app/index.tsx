import { createFileRoute } from '@tanstack/react-router'

import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { RouteSkeleton } from '@/components/layout/route-skeleton'
import { queryKeys } from '@/lib/query-keys'
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
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.dashboardCounts,
        queryFn: () => getDashboardCounts(),
      }),
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.myWeekMinutes,
        queryFn: () => getMyWeekMinutes(),
      }),
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.workHourAnalysis('2W'),
        queryFn: () => getWorkHourAnalysis({ data: { range: '2W' } }),
      }),
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.runningEntry,
        queryFn: () => getRunningEntry(),
      }),
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.projects,
        queryFn: () => getProjects(),
      }),
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.myEntries,
        queryFn: () => listMyEntries({ data: { limit: 10 } }),
      }),
      ...(session
        ? [
            queryClient.query({
              staleTime: 'static',
              queryKey: queryKeys.myIssues,
              queryFn: () =>
                listIssues({
                  data: { assigneeId: session.user.id, limit: 8 },
                }),
            }),
          ]
        : []),
    ])
  },
  pendingComponent: RouteSkeleton,
  component: DashboardPage,
})
