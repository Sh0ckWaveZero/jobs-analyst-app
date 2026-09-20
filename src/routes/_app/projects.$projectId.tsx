import { createFileRoute } from '@tanstack/react-router'

import { ProjectDetailPage } from '@/features/projects/project-detail-page'
import { getProjects } from '@/features/projects/projects.functions'
import { listIssues } from '@/features/issues/issues.functions'

export const Route = createFileRoute('/_app/projects/$projectId')({
  loader: ({ context: { queryClient }, params: { projectId } }) => {
    const pid = Number(projectId)
    return Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['pm', 'projects'],
        queryFn: () => getProjects(),
      }),
      queryClient.ensureQueryData({
        queryKey: ['pm', 'project-issues', pid],
        queryFn: () => listIssues({ data: { projectId: pid, limit: 100 } }),
      }),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  return <ProjectDetailPage projectId={projectId} />
}
