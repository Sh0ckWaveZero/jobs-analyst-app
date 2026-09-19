import { createFileRoute } from '@tanstack/react-router'

import { ProjectDetailPage } from '@/features/projects/project-detail-page'

export const Route = createFileRoute('/_app/projects/$projectId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  return <ProjectDetailPage projectId={projectId} />
}
