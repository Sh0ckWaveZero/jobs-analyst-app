import { createFileRoute } from '@tanstack/react-router'

import { ProjectsPage } from '@/features/projects/projects-page'
import { getProjects } from '@/features/projects/projects.functions'

export const Route = createFileRoute('/_app/projects/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ['pm', 'projects'],
      queryFn: () => getProjects(),
    }),
  component: ProjectsPage,
})
