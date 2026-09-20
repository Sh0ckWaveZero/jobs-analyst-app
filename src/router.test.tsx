import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

import { getRouter } from './router'

describe('getRouter', () => {
  it('สร้าง router ใหม่พร้อม QueryClient ของตัวเองทุกครั้ง', () => {
    const a = getRouter()
    const b = getRouter()

    expect(a).not.toBe(b)
    expect(a.options.context.queryClient).toBeInstanceOf(QueryClient)
    expect(a.options.context.queryClient).not.toBe(b.options.context.queryClient)
    expect(a.options.routeTree).toBeDefined()
  })

  it('ssr-query integration ติดตั้ง Wrap (QueryClientProvider)', () => {
    const router = getRouter()
    expect(typeof router.options.Wrap).toBe('function')
  })

  it('ค่า default ที่ตั้งไว้: staleTime 30s + preload intent', () => {
    const router = getRouter()
    expect(
      router.options.context.queryClient.getDefaultOptions().queries?.staleTime,
    ).toBe(30_000)
    expect(router.options.defaultPreload).toBe('intent')
  })
})
