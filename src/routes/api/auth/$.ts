import { createFileRoute } from '@tanstack/react-router'

import { auth } from '@/features/auth/auth.server'

function handle(request: Request) {
  return auth.handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handle(request),
      POST: async ({ request }: { request: Request }) => handle(request),
    },
  },
})
