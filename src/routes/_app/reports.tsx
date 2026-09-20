import { createFileRoute } from '@tanstack/react-router'

import { ReportsPage } from '@/features/reports/reports-page'
import { RouteSkeleton } from '@/components/layout/route-skeleton'
import { queryKeys } from '@/lib/query-keys'
import { getWorkHourReport } from '@/features/time-entries/time-entries.functions'

export const Route = createFileRoute('/_app/reports')({
  loader: ({ context: { queryClient } }) =>
    queryClient.query({
      staleTime: 'static',
      queryKey: queryKeys.report('1M'),
      queryFn: () => getWorkHourReport({ data: { range: '1M' } }),
    }),
  pendingComponent: RouteSkeleton,
  component: ReportsPage,
})
