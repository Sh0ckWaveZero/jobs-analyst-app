import { createFileRoute } from '@tanstack/react-router'

import { MyEntriesPage } from '@/features/time-entries/my-entries-page'
import { RouteSkeleton } from '@/components/layout/route-skeleton'
import { queryKeys } from '@/lib/query-keys'
import {
  countMyEntries,
  listMyEntries,
} from '@/features/time-entries/time-entries.functions'

export const Route = createFileRoute('/_app/time-entries')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.myEntriesPage(1),
        queryFn: () => listMyEntries({ data: { limit: 20, offset: 0 } }),
      }),
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.myEntriesCount,
        queryFn: () => countMyEntries(),
      }),
    ]),
  pendingComponent: RouteSkeleton,
  component: MyEntriesPage,
})
