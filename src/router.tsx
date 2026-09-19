import { QueryClient } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  // สร้างต่อ router instance: ฝั่ง client ได้ singleton ต่อ app
  // ฝั่ง server ได้ instance ใหม่ต่อ request (กัน cache ปนกันระหว่าง user)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
      },
    },
  })

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  // dehydrate query cache ลง SSR stream + hydrate ฝั่ง client
  // (รวมถึง wrap QueryClientProvider ให้อัตโนมัติ)
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
