import { createFileRoute } from '@tanstack/react-router'

import { ProjectDetailPage } from '@/features/projects/project-detail-page'
import { RouteSkeleton } from '@/components/layout/route-skeleton'
import { queryKeys } from '@/lib/query-keys'
import { getProjects } from '@/features/projects/projects.functions'
import { listIssues } from '@/features/issues/issues.functions'

export const Route = createFileRoute('/_app/projects/$projectId')({
  loader: ({ context: { queryClient }, params: { projectId } }) => {
    const pid = Number(projectId)
    return Promise.all([
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.projects,
        queryFn: () => getProjects(),
      }),
      queryClient.query({
        staleTime: 'static',
        queryKey: queryKeys.projectIssues(pid),
        queryFn: () => listIssues({ data: { projectId: pid, limit: 100 } }),
      }),
    ])
  },
  pendingComponent: RouteSkeleton,
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  return <ProjectDetailPage projectId={projectId} />
}
