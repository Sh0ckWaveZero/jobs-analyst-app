import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

import { Route as DashboardRoute } from './_app/index'
import { Route as ProjectsRoute } from './_app/projects.index'
import { Route as ProjectDetailRoute } from './_app/projects.$projectId'
import { Route as ReportsRoute } from './_app/reports'
import { Route as UsersRoute } from './_app/users'
import { Route as SettingsRoute } from './_app/settings'
import { Route as AccessRoute } from './_app/access'
import { Route as TimeEntriesRoute } from './_app/time-entries'
import { Route as IssueWorklogRoute } from './_app/issues.$issueId'
import { getSession } from '@/features/auth/auth.functions'
import {
  getDashboardCounts,
  listIssues,
} from '@/features/issues/issues.functions'
import { getProjects } from '@/features/projects/projects.functions'
import {
  countIssueEntries,
  countMyEntries,
  getIssueMeta,
  getMyWeekMinutes,
  getRunningEntry,
  getWorkHourAnalysis,
  getWorkHourReport,
  listIssueEntries,
  listMyEntries,
} from '@/features/time-entries/time-entries.functions'
import { listDepartments, listUsers } from '@/features/users/users.functions'
import { listRoles, listRbacMatrix } from '@/features/settings/rbac.functions'
import { queryKeys } from '@/lib/query-keys'

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
  getWorkHourReport: vi.fn(),
  listMyEntries: vi.fn(),
  countMyEntries: vi.fn(),
  listIssueEntries: vi.fn(),
  countIssueEntries: vi.fn(),
  getIssueMeta: vi.fn(),
}))
vi.mock('@/features/users/users.functions', () => ({
  listUsers: vi.fn(),
  listDepartments: vi.fn(),
}))
vi.mock('@/features/settings/rbac.functions', () => ({
  listRoles: vi.fn(),
  listRbacMatrix: vi.fn(),
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
  vi.mocked(getWorkHourReport).mockResolvedValue({
    range: '1M',
    rows: [],
    totalMinutes: 0,
  } as never)
  vi.mocked(listMyEntries).mockResolvedValue([] as never)
  vi.mocked(countMyEntries).mockResolvedValue(0)
  vi.mocked(listIssueEntries).mockResolvedValue([] as never)
  vi.mocked(countIssueEntries).mockResolvedValue(0)
  vi.mocked(getIssueMeta).mockResolvedValue({
    id: 55,
    projectId: 17,
    projectKey: 'APP',
    number: 106,
    title: 'Offline caching layer',
  })
  vi.mocked(listUsers).mockResolvedValue([] as never)
  vi.mocked(listDepartments).mockResolvedValue([] as never)
  vi.mocked(listRbacMatrix).mockResolvedValue({
    roles: [],
    permissions: [],
  })
  vi.mocked(listRoles).mockResolvedValue([])
})

describe('route loaders', () => {
  it('dashboard loader เติม query cache ครบทุก key', async () => {
    const qc = new QueryClient()
    await (
      DashboardRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc } })

    expect(qc.getQueryData(queryKeys.dashboardCounts)).toBeDefined()
    expect(qc.getQueryData(queryKeys.myWeekMinutes)).toBeDefined()
    expect(qc.getQueryData(queryKeys.workHourAnalysis('2W'))).toBeDefined()
    expect(qc.getQueryData(queryKeys.runningEntry)).toBeNull()
    expect(qc.getQueryData(queryKeys.projects)).toBeDefined()
    expect(qc.getQueryData(queryKeys.myEntries)).toBeDefined()
    expect(qc.getQueryData(queryKeys.myIssues)).toBeDefined()
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

    expect(qc.getQueryData(queryKeys.projects)).toEqual({ projects: [] })
  })

  it('project detail loader ดึง issues ของโปรเจกต์นั้น', async () => {
    const qc = new QueryClient()
    await (
      ProjectDetailRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc }, params: { projectId: '16' } })

    expect(listIssues).toHaveBeenCalledWith({
      data: { projectId: 16, limit: 100 },
    })
    expect(qc.getQueryData(queryKeys.projectIssues(16))).toEqual([])
  })

  it('users loader (admin) เติม users + departments + roles', async () => {
    const qc = new QueryClient()
    await (UsersRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>)({
      context: { queryClient: qc },
    })

    expect(qc.getQueryData(queryKeys.users)).toBeDefined()
    expect(qc.getQueryData(queryKeys.departments)).toBeDefined()
    expect(qc.getQueryData(queryKeys.roles)).toBeDefined()
  })

  it('users loader (member) ไม่ prefetch อะไรเลย', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'u2', name: 'Nok', role: 'member' },
    } as never)
    const qc = new QueryClient()
    await (UsersRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>)({
      context: { queryClient: qc },
    })

    expect(qc.getQueryData(queryKeys.users)).toBeUndefined()
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('settings loader เติม departments', async () => {
    const qc = new QueryClient()
    await (
      SettingsRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc } })

    expect(qc.getQueryData(queryKeys.departments)).toEqual([])
  })

  it('access loader (admin) เติม users + departments + roles + RBAC', async () => {
    const qc = new QueryClient()
    await (AccessRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>)({
      context: { queryClient: qc },
    })

    expect(qc.getQueryData(queryKeys.users)).toBeDefined()
    expect(qc.getQueryData(queryKeys.departments)).toBeDefined()
    expect(qc.getQueryData(queryKeys.roles)).toBeDefined()
    expect(qc.getQueryData(queryKeys.rbac)).toBeDefined()
  })

  it('reports loader เติมรายงานช่วง 1M', async () => {
    const qc = new QueryClient()
    await (ReportsRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>)(
      { context: { queryClient: qc } },
    )

    expect(getWorkHourReport).toHaveBeenCalledWith({ data: { range: '1M' } })
    expect(qc.getQueryData(queryKeys.report('1M'))).toBeDefined()
  })

  it('time-entries loader เติมหน้าแรก + count', async () => {
    const qc = new QueryClient()
    await (
      TimeEntriesRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc } })

    expect(listMyEntries).toHaveBeenCalledWith({
      data: { limit: 20, offset: 0 },
    })
    expect(qc.getQueryData(queryKeys.myEntriesPage(1))).toEqual([])
    expect(qc.getQueryData(queryKeys.myEntriesCount)).toEqual(0)
  })

  it('issues/$issueId loader เติม meta + worklog หน้าแรก + count', async () => {
    const qc = new QueryClient()
    await (
      IssueWorklogRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc }, params: { issueId: '55' } })

    expect(getIssueMeta).toHaveBeenCalledWith({ data: { issueId: 55 } })
    expect(listIssueEntries).toHaveBeenCalledWith({
      data: { issueId: 55, limit: 20, offset: 0 },
    })
    expect(qc.getQueryData(queryKeys.issueMeta(55))).toBeDefined()
    expect(qc.getQueryData(queryKeys.issueEntriesPage(55, 1))).toEqual([])
    expect(qc.getQueryData(queryKeys.issueEntriesCount(55))).toEqual(0)
  })

  it('dashboard loader ไม่มี session → ข้าม prefetch my-issues', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const qc = new QueryClient()
    await (
      DashboardRoute.options.loader as (ctx: LoaderCtx) => Promise<unknown>
    )({ context: { queryClient: qc } })

    expect(qc.getQueryData(queryKeys.myIssues)).toBeUndefined()
    expect(listIssues).not.toHaveBeenCalled()
  })
})
