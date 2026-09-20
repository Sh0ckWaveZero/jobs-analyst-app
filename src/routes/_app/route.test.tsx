import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Route } from './route'
import { getSession } from '@/features/auth/auth.functions'

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
    (options: unknown): { options: unknown } => ({ options }),
  Outlet: () => <div data-testid="outlet">CONTENT</div>,
  redirect: (opts: { to: string }) => {
    throw Object.assign(new Error('REDIRECT'), opts)
  },
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
    expect(
      screen.getByRole('button', { name: 'Toggle Sidebar' }),
    ).toBeInTheDocument()
  })

  it('แสดงชื่อแอปใน Header โดยไม่ใส่ breadcrumb', () => {
    render(<options.component />)
    expect(screen.getByText('Jobs Analysis')).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Breadcrumb' }),
    ).not.toBeInTheDocument()
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
