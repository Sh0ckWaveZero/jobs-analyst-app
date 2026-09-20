import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'

import { IssueWorklogPage } from './issue-worklog-page'
import {
  countIssueEntries,
  getIssueMeta,
  listIssueEntries,
} from './time-entries.functions'

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock('@/features/auth/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: 'u1', name: 'Somchai Admin' } } }),
  },
}))
vi.mock('./time-entries.functions', () => ({
  listIssueEntries: vi.fn(),
  countIssueEntries: vi.fn(),
  getIssueMeta: vi.fn(),
}))

const metaFixture = {
  id: 106,
  projectId: 17,
  projectKey: 'APP',
  number: 106,
  title: 'Offline caching layer',
}

function rowsFixture(n: number, offset = 0) {
  return Array.from({ length: n }).map((_, i) => ({
    id: offset + i + 1,
    userId: 'u1',
    userName: i === n - 1 ? null : 'Somchai Admin',
    durationMinutes: 60,
    workDate: '2026-09-19',
    note: null,
    startedAt: new Date('2026-09-19T10:00:00.000Z'),
    running: i === n - 1,
  }))
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <IssueWorklogPage issueId="106" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(listIssueEntries).mockReset()
  vi.mocked(countIssueEntries).mockReset()
  vi.mocked(getIssueMeta).mockReset()
  vi.mocked(getIssueMeta).mockResolvedValue(metaFixture)
})

describe('IssueWorklogPage', () => {
  it('แสดง issue identity + รายการ + จำนวนรวม', async () => {
    vi.mocked(listIssueEntries).mockResolvedValue(rowsFixture(20))
    vi.mocked(countIssueEntries).mockResolvedValue(35)
    renderPage()

    expect(await screen.findByText('APP-106')).toBeInTheDocument()
    expect(screen.getByText('Offline caching layer')).toBeInTheDocument()
    expect(await screen.findByText(/35 รายการ/)).toBeInTheDocument()
    expect(listIssueEntries).toHaveBeenCalledWith({
      data: { issueId: 106, limit: 20, offset: 0 },
    })
  })

  it('กด Next → โหลดหน้าถัดไปด้วย offset 20', async () => {
    vi.mocked(listIssueEntries)
      .mockResolvedValueOnce(rowsFixture(20))
      .mockResolvedValue(rowsFixture(15, 20))
    vi.mocked(countIssueEntries).mockResolvedValue(35)
    const user = userEvent.setup()
    renderPage()

    await screen.findByText(/35 รายการ/)
    await user.click(screen.getByRole('button', { name: /Next/ }))

    expect(await screen.findByRole('button', { name: /Next/ })).toBeDisabled()
    expect(listIssueEntries).toHaveBeenCalledWith({
      data: { issueId: 106, limit: 20, offset: 20 },
    })
  })

  it('ไม่มีรายการ → empty state', async () => {
    vi.mocked(listIssueEntries).mockResolvedValue([])
    vi.mocked(countIssueEntries).mockResolvedValue(0)
    renderPage()

    expect(
      await screen.findByText('ยังไม่มีรายการเวลาใน issue นี้'),
    ).toBeInTheDocument()
  })

  it('เลือก Mine → เรียก server ด้วย userId ของ session', async () => {
    vi.mocked(listIssueEntries).mockResolvedValue(rowsFixture(3))
    vi.mocked(countIssueEntries).mockResolvedValue(3)
    const user = userEvent.setup()
    renderPage()

    await screen.findByText(/3 รายการ/)
    await user.click(screen.getByRole('button', { name: 'Mine' }))

    await waitFor(() =>
      expect(listIssueEntries).toHaveBeenCalledWith({
        data: { issueId: 106, limit: 20, offset: 0, userId: 'u1' },
      }),
    )
    expect(countIssueEntries).toHaveBeenCalledWith({
      data: { issueId: 106, userId: 'u1' },
    })
  })

  it('สลับ Mine → All → กลับมาไม่ส่ง userId', async () => {
    vi.mocked(listIssueEntries).mockResolvedValue(rowsFixture(3))
    vi.mocked(countIssueEntries).mockResolvedValue(3)
    const user = userEvent.setup()
    renderPage()

    await screen.findByText(/3 รายการ/)
    await user.click(screen.getByRole('button', { name: 'Mine' }))
    await user.click(screen.getByRole('button', { name: 'All' }))

    await waitFor(() =>
      expect(listIssueEntries).toHaveBeenLastCalledWith({
        data: { issueId: 106, limit: 20, offset: 0, userId: undefined },
      }),
    )
  })
})
