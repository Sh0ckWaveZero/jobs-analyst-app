import { createFileRoute } from '@tanstack/react-router'

import { ProjectsPage } from '@/features/projects/projects-page'
import { RouteSkeleton } from '@/components/layout/route-skeleton'
import { queryKeys } from '@/lib/query-keys'
import { getProjects } from '@/features/projects/projects.functions'

export const Route = createFileRoute('/_app/projects/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.query({
      staleTime: 'static',
      queryKey: queryKeys.projects,
      queryFn: () => getProjects(),
    }),
  pendingComponent: RouteSkeleton,
  component: ProjectsPage,
})
