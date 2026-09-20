import { createFileRoute } from '@tanstack/react-router'

import { ReportsPage } from '@/features/reports/reports-page'
import { getWorkHourReport } from '@/features/time-entries/time-entries.functions'

export const Route = createFileRoute('/_app/reports')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ['pm', 'report', '1M'],
      queryFn: () => getWorkHourReport({ data: { range: '1M' } }),
    }),
  component: ReportsPage,
})
