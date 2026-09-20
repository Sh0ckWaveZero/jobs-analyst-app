import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { AppSidebar } from './app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import {
  getArchivedProjects,
  getProjects,
} from '@/features/projects/projects.functions'

const state = vi.hoisted(() => ({
  session: {
    user: {
      id: 'u1',
      name: 'Somchai Admin',
      email: 'admin@pm.local',
      role: 'admin',
    },
  },
  pathname: '/',
  search: {},
  signOut: vi.fn(async () => {}),
  navigate: vi.fn(async () => {}),
}))

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode
    to: string
    [key: string]: unknown
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => state.navigate,
  useRouterState: ({
    select,
  }: {
    select: (s: {
      location: { pathname: string; search: Record<string, unknown> }
    }) => unknown
  }) =>
    select({
      location: { pathname: state.pathname, search: state.search },
    }),
}))
vi.mock('@/features/auth/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: state.session }),
    signOut: state.signOut,
  },
}))
vi.mock('@/features/projects/projects.functions', () => ({
  getProjects: vi.fn(),
  getArchivedProjects: vi.fn(),
}))

function renderSidebar() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(getProjects).mockResolvedValue({
    projects: [{ id: 16, key: 'WEB', name: 'Website Revamp', ownerId: 'u2' }],
  } as never)
  vi.mocked(getArchivedProjects).mockResolvedValue([] as never)
  state.session = {
    user: {
      id: 'u1',
      name: 'Somchai Admin',
      email: 'admin@pm.local',
      role: 'admin',
    },
  }
  state.pathname = '/'
  state.search = {}
})

describe('AppSidebar', () => {
  it('render nav หลัก + โปรเจกต์ + ข้อมูลผู้ใช้', async () => {
    renderSidebar()

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Access management')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Active Projects')).toBeInTheDocument()
    expect(await screen.findByText('Website Revamp')).toBeInTheDocument()
    expect(screen.getByText('Somchai Admin')).toBeInTheDocument()
    expect(screen.getByText('admin@pm.local')).toBeInTheDocument()
    expect(screen.getByText('SA')).toBeInTheDocument() // initials
  })

  it('member ไม่เห็นเมนู Users', async () => {
    state.session = {
      user: { id: 'u2', name: 'Nok', email: 'n@pm.local', role: 'member' },
    }
    renderSidebar()
    await screen.findByText('Dashboard')
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
    expect(screen.queryByText('Access management')).not.toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('pathname /users → เมนู Users ถูก mark active', async () => {
    state.pathname = '/users'
    renderSidebar()
    const usersLink = await screen.findByText('Users')
    expect(usersLink.closest('a')).toHaveAttribute('data-active', 'true')
    expect(screen.getByText('Dashboard').closest('a')).not.toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('กด Settings แล้วไปหน้า settings ได้', () => {
    renderSidebar()

    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    )
  })

  it('submenu ของ Settings แสดง icons และ mark tab ปัจจุบัน active', () => {
    state.pathname = '/settings'
    state.search = { tab: 'security', section: 'departments' }
    renderSidebar()

    for (const label of [
      'โปรไฟล์',
      'ความปลอดภัย',
      'การแจ้งเตือน',
      'Access management',
    ]) {
      expect(
        screen.getByRole('link', { name: label }).querySelector('svg'),
      ).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: 'ความปลอดภัย' })).toHaveAttribute(
      'data-active',
      'true',
    )
    expect(screen.getByRole('link', { name: 'โปรไฟล์' })).not.toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('ยุบ/ขยายรายชื่อโปรเจกต์ผ่าน menu action', async () => {
    renderSidebar()
    expect(await screen.findByText('Website Revamp')).toBeInTheDocument()

    fireEvent.click(
      document.querySelector('[data-sidebar="menu-action"]') as HTMLElement,
    )
    expect(screen.queryByText('Website Revamp')).not.toBeInTheDocument()
  })

  it('โปรเจกต์ที่ archive ไว้แสดงในกลุ่ม Archived และยุบได้', async () => {
    vi.mocked(getArchivedProjects).mockResolvedValue([
      { id: 90, key: 'OLD', name: 'Legacy System', ownerId: 'u2' },
    ] as never)
    renderSidebar()
    expect(await screen.findByText('Legacy System')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Archived'))
    expect(screen.queryByText('Legacy System')).not.toBeInTheDocument()
  })

  it('dropdown ผู้ใช้: Profile + Log out เรียก signOut และ navigate', async () => {
    const user = userEvent.setup()
    renderSidebar()
    await screen.findByText('Somchai Admin')

    await user.click(screen.getByRole('button', { name: /Somchai Admin/ }))
    expect(await screen.findByText('Log out')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()

    await user.click(screen.getByText('Log out'))
    await waitFor(() => expect(state.signOut).toHaveBeenCalled())
    await waitFor(() =>
      expect(state.navigate).toHaveBeenCalledWith({ to: '/login' }),
    )
  })

  it('ไม่มี session → ใช้ fallback ชื่อ/อีเมล', async () => {
    state.session = null as never
    renderSidebar()
    expect((await screen.findAllByText('…')).length).toBeGreaterThan(0)
  })

  it('อยู่ในหน้า /projects/17 → ลิงก์ Projects active', async () => {
    state.pathname = '/projects/17'
    renderSidebar()
    const active = document.querySelector('[data-active="true"]')
    expect(active).not.toBeNull()
  })
})
