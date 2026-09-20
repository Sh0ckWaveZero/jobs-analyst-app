import { createFileRoute } from '@tanstack/react-router'

import { IssueWorklogPage } from '@/features/time-entries/issue-worklog-page'
import { RouteSkeleton } from '@/components/layout/route-skeleton'
import { queryKeys } from '@/lib/query-keys'
import {
  countIssueEntries,
  getIssueMeta,
  listIssueEntries,
} from '@/features/time-entries/time-entries.functions'

export const Route = createFileRoute('/_app/issues/$issueId')({
  loader: ({ context: { queryClient }, params: { issueId } }) => {
    const id = Number(issueId)
    return Promise.all([
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.issueMeta(id),
        queryFn: () => getIssueMeta({ data: { issueId: id } }),
      }),
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.issueEntriesPage(id, 1),
        queryFn: () =>
          listIssueEntries({ data: { issueId: id, limit: 20, offset: 0 } }),
      }),
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.issueEntriesCount(id),
        queryFn: () => countIssueEntries({ data: { issueId: id } }),
      }),
    ])
  },
  pendingComponent: RouteSkeleton,
  component: RouteComponent,
})

function RouteComponent() {
  const { issueId } = Route.useParams()
  return <IssueWorklogPage issueId={issueId} />
}
