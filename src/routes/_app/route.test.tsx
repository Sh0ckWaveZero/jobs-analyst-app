import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Route } from './route'
import { getSession } from '@/features/auth/auth.functions'

const state = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('@/components/layout/app-sidebar', () => ({
  AppSidebar: () => <div data-testid="sidebar">SIDEBAR</div>,
}))
vi.mock('@/components/layout/command-menu', () => ({
  CommandMenu: () => <div data-testid="command-menu">COMMAND MENU</div>,
  NotificationsMenu: () => <div data-testid="notifications">NOTIFICATIONS</div>,
}))
vi.mock('@/features/auth/auth.functions', () => ({ getSession: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    (options: unknown): { options: unknown } =>
      ({ options }),
  Outlet: () => <div data-testid="outlet">CONTENT</div>,
  redirect: (opts: { to: string }) => {
    throw Object.assign(new Error('REDIRECT'), opts)
  },
  useRouterState: ({
    select,
  }: {
    select: (s: { location: { pathname: string } }) => unknown
  }) => select({ location: { pathname: state.pathname } }),
  useNavigate: () => vi.fn(),
}))

const options = Route.options as unknown as {
  component: () => React.ReactElement
  beforeLoad: () => Promise<void>
}

describe('/_app layout', () => {
  it('render sidebar + header + outlet', () => {
    render(<options.component />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle Sidebar' })).toBeInTheDocument()
  })

  it('หัวข้อ section เปลี่ยนตาม pathname', () => {
    state.pathname = '/projects'
    const { rerender } = render(<options.component />)
    expect(screen.getByText('Projects')).toBeInTheDocument()

    state.pathname = '/'
    rerender(<options.component />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})

describe('/_app beforeLoad', () => {
  it('ไม่มี session → redirect ไป /login', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    await expect(options.beforeLoad()).rejects.toThrow('REDIRECT')
  })

  it('มี session → ผ่านต่อ', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as never)
    await expect(options.beforeLoad()).resolves.toBeUndefined()
  })
})
