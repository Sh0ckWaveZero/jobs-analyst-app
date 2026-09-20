import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'

import { MyEntriesPage } from './my-entries-page'
import { countMyEntries, listMyEntries } from './time-entries.functions'

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('./time-entries.functions', () => ({
  listMyEntries: vi.fn(),
  countMyEntries: vi.fn(),
}))

function rowsFixture(n: number, offset = 0) {
  return Array.from({ length: n }).map((_, i) => ({
    id: offset + i + 1,
    projectKey: 'WEB',
    issueNumber: i === n - 1 ? null : 100 + i,
    issueTitle: i === n - 1 ? null : `Issue ${offset + i + 1}`,
    durationMinutes: 60,
    workDate: '2026-09-19',
    running: i === n - 1,
    startedAt: new Date('2026-09-19T10:00:00.000Z'),
  }))
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MyEntriesPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(listMyEntries).mockReset()
  vi.mocked(countMyEntries).mockReset()
})

describe('MyEntriesPage', () => {
  it('หน้าแรก: แสดงรายการ + จำนวนรวม + เรียก server ด้วย offset 0', async () => {
    vi.mocked(listMyEntries).mockResolvedValue(rowsFixture(20))
    vi.mocked(countMyEntries).mockResolvedValue(45)
    renderPage()

    expect(await screen.findByText('Issue 1')).toBeInTheDocument()
    expect(await screen.findByText(/45 รายการ/)).toBeInTheDocument()
    expect(listMyEntries).toHaveBeenCalledWith({
      data: { limit: 20, offset: 0 },
    })
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled()
  })

  it('กด Next → โหลดหน้าถัดไปด้วย offset 20', async () => {
    vi.mocked(listMyEntries)
      .mockResolvedValueOnce(rowsFixture(20)) // หน้า 1
      .mockResolvedValue(rowsFixture(20, 20)) // หน้า 2
    vi.mocked(countMyEntries).mockResolvedValue(45)
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Issue 1')
    await user.click(screen.getByRole('button', { name: /Next/ }))

    expect(await screen.findByText('Issue 21')).toBeInTheDocument()
    expect(listMyEntries).toHaveBeenCalledWith({
      data: { limit: 20, offset: 20 },
    })
  })

  it('หน้าสุดท้าย → Next ปิด', async () => {
    vi.mocked(listMyEntries)
      .mockResolvedValueOnce(rowsFixture(20)) // หน้า 1
      .mockResolvedValue(rowsFixture(5, 20)) // หน้าสุดท้าย (40 / 20)
    vi.mocked(countMyEntries).mockResolvedValue(40)
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Issue 1')
    await user.click(screen.getByRole('button', { name: /Next/ }))
    expect(await screen.findByText('Issue 21')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled()
  })

  it('ไม่มีรายการ → empty state', async () => {
    vi.mocked(listMyEntries).mockResolvedValue([])
    vi.mocked(countMyEntries).mockResolvedValue(0)
    renderPage()

    expect(await screen.findByText('ยังไม่มีรายการเวลา')).toBeInTheDocument()
  })
})
