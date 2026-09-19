import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

import { Route as DashboardRoute } from './_app/index'
import { Route as ProjectsRoute } from './_app/projects.index'
import { Route as ProjectDetailRoute } from './_app/projects.$projectId'
import { Route as UsersRoute } from './_app/users'
import { Route as SettingsRoute } from './_app/settings'
import { getSession } from '@/features/auth/auth.functions'
import { getDashboardCounts, listIssues } from '@/features/issues/issues.functions'
import { getProjects } from '@/features/projects/projects.functions'
import {
  getMyWeekMinutes,
  getRunningEntry,
  getWorkHourAnalysis,
  listMyEntries,
} from '@/features/time-entries/time-entries.functions'
import { listDepartments, listUsers } from '@/features/users/users.functions'

const state = vi.hoisted(() => ({
  session: {
    user: { id: 'u1', name: 'Somchai Admin', role: 'admin' },
  },
}))

vi.mock('@/features/auth/auth-client', () => ({
  authClient: { useSession: () => ({ data: state.session }) },
}))
vi.mock('@/features/auth/auth.functions', () => ({ getSession: vi.fn() }))
vi.mock('@/features/projects/projects.functions', () => ({
  getProjects: vi.fn(),
}))
vi.mock('@/features/issues/issues.functions', () => ({
  getDashboardCounts: vi.fn(),
  listIssues: vi.fn(),
}))
vi.mock('@/features/time-entries/time-entries.functions', () => ({
  getMyWeekMinutes: vi.fn(),
  getRunningEntry: vi.fn(),
  getWorkHourAnalysis: vi.fn(),
  listMyEntries: vi.fn(),
}))
vi.mock('@/features/users/users.functions', () => ({
  listUsers: vi.fn(),
  listDepartments: vi.fn(),
}))

 
type LoaderCtx = { context: { queryClient: QueryClient }; params?: any }

beforeEach(() => {
  vi.mocked(getSession).mockResolvedValue(state.session as never)
  vi.mocked(getProjects).mockResolvedValue({ projects: [] } as never)
  vi.mocked(getDashboardCounts).mockResolvedValue({
    created: 0,
    assigned: 0,
    statusCounts: {},
  })
  vi.mocked(listIssues).mockResolvedValue([] as never)
  vi.mocked(getMyWeekMinutes).mockResolvedValue(0)
  vi.mocked(getRunningEntry).mockResolvedValue(null)
  vi.mocked(getWorkHourAnalysis).mockResolvedValue({
    totalMinutes: 0,
    series: [],
  } as never)
  vi.mocked(listMyEntries).mockResolvedValue([] as never)
  vi.mocked(listUsers).mockResolvedValue([] as never)
  vi.mocked(listDepartments).mockResolvedValue([] as never)
})

describe('route loaders', () => {
  it('dashboard loader เติม query cache ครบทุก key', async () => {
    const qc = new QueryClient()
    await (
      DashboardRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc } })

    expect(qc.getQueryData(['pm', 'counts'])).toBeDefined()
    expect(qc.getQueryData(['pm', 'week'])).toBeDefined()
    expect(qc.getQueryData(['pm', 'analysis', '2W'])).toBeDefined()
    expect(qc.getQueryData(['pm', 'running'])).toBeNull()
    expect(qc.getQueryData(['pm', 'projects'])).toBeDefined()
    expect(qc.getQueryData(['pm', 'my-entries'])).toBeDefined()
    expect(qc.getQueryData(['pm', 'issues', 'mine'])).toBeDefined()
    // my-issues ใช้ session ปัจจุบันใน queryFn
    expect(listIssues).toHaveBeenCalledWith({
      data: { assigneeId: 'u1', limit: 8 },
    })
  })

  it('projects loader เติม cache โปรเจกต์', async () => {
    const qc = new QueryClient()
    await (
      ProjectsRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc } })

    expect(qc.getQueryData(['pm', 'projects'])).toEqual({ projects: [] })
  })

  it('project detail loader ดึง issues ของโปรเจกต์นั้น', async () => {
    const qc = new QueryClient()
    await (
      ProjectDetailRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc }, params: { projectId: '16' } })

    expect(listIssues).toHaveBeenCalledWith({
      data: { projectId: 16, limit: 100 },
    })
    expect(qc.getQueryData(['pm', 'project-issues', 16])).toEqual([])
  })

  it('users loader (admin) เติม users + departments', async () => {
    const qc = new QueryClient()
    await (
      UsersRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc } })

    expect(qc.getQueryData(['pm', 'users'])).toBeDefined()
    expect(qc.getQueryData(['pm', 'departments'])).toBeDefined()
  })

  it('users loader (member) ไม่ prefetch อะไรเลย', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'u2', name: 'Nok', role: 'member' },
    } as never)
    const qc = new QueryClient()
    await (
      UsersRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc } })

    expect(qc.getQueryData(['pm', 'users'])).toBeUndefined()
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('settings loader เติม departments', async () => {
    const qc = new QueryClient()
    await (
      SettingsRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc } })

    expect(qc.getQueryData(['pm', 'departments'])).toEqual([])
  })
})
