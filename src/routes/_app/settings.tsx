import { createFileRoute } from '@tanstack/react-router'

import { SettingsPage } from '@/features/settings/settings-page'
import { listDepartments } from '@/features/users/users.functions'

export const Route = createFileRoute('/_app/settings')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ['pm', 'departments'],
      queryFn: () => listDepartments(),
    }),
  component: SettingsPage,
})
