import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'

import { DashboardPage } from './dashboard-page'
import { getDashboardCounts, listIssues } from '@/features/issues/issues.functions'
import {
  getMyWeekMinutes,
  getWorkHourAnalysis,
  listMyEntries,
  startTimer,
  stopTimer,
} from '@/features/time-entries/time-entries.functions'
import { getProjects } from '@/features/projects/projects.functions'
import { Toaster } from '@/components/ui/sonner'

const state = vi.hoisted(() => ({
  session: {
    user: { id: 'u8', name: 'Nok Member', role: 'member' },
  },
  running: null as
    | {
        id: number
        projectKey: string
        issueNumber: number | null
        issueTitle: string | null
        note: string | null
        startedAt: string
      }
    | null,
}))

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock('@/features/auth/auth-client', () => ({
  authClient: { useSession: () => ({ data: state.session }) },
}))
vi.mock('@/features/projects/projects.functions', () => ({
  getProjects: vi.fn(),
}))
vi.mock('@/features/issues/issues.functions', () => ({
  getDashboardCounts: vi.fn(),
  listIssues: vi.fn(),
}))
vi.mock('@/features/time-entries/time-entries.functions', () => ({
  getMyWeekMinutes: vi.fn(),
  getRunningEntry: vi.fn(() => state.running),
  getWorkHourAnalysis: vi.fn(),
  listMyEntries: vi.fn(),
  startTimer: vi.fn(),
  stopTimer: vi.fn(),
}))

const myIssues = [
  {
    id: 108,
    key: 'WEB-108',
    title: 'Dark mode support',
    status: 'backlog',
    priority: 'low',
  },
]

const myEntries = [
  {
    id: 900,
    workDate: '2026-09-18',
    projectKey: 'APP',
    issueNumber: 106,
    issueTitle: 'Offline caching layer',
    durationMinutes: 90,
    running: true,
  },
  {
    id: 901,
    workDate: '2026-09-17',
    projectKey: 'INFRA',
    issueNumber: null,
    issueTitle: null,
    durationMinutes: 75,
    running: false,
  },
]

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <DashboardPage />
      <Toaster />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(getProjects).mockResolvedValue({
    projects: [
      { id: 16, key: 'WEB', name: 'Website Revamp', ownerId: 'u2' },
    ],
  } as never)
  vi.mocked(getDashboardCounts).mockResolvedValue({
    created: 1,
    assigned: 4,
    statusCounts: { backlog: 2, todo: 1, in_progress: 0, review: 0, done: 1 },
  })
  vi.mocked(listIssues).mockResolvedValue(myIssues as never)
  vi.mocked(getMyWeekMinutes).mockResolvedValue(1125) // 18h 45m
  vi.mocked(getWorkHourAnalysis).mockResolvedValue({
    totalMinutes: 11370, // 189h 30m
    series: [
      { date: '2026-09-18', minutes: 420 },
      { date: '2026-09-19', minutes: 300 },
    ],
  } as never)
  vi.mocked(listMyEntries).mockResolvedValue(myEntries as never)
  vi.mocked(startTimer).mockReset()
  vi.mocked(stopTimer).mockReset()
  state.running = null
})

describe('DashboardPage — การ์ดสถิติและข้อมูล', () => {
  it('แสดงชื่อผู้ใช้ใน header', async () => {
    renderPage()
    expect(
      await screen.findByText(/ภาพรวมงานและชั่วโมงทำงาน · Nok Member/),
    ).toBeInTheDocument()
  })

  it('การ์ดสถิติ: created/assigned/ชั่วโมงสัปดาห์นี้', async () => {
    renderPage()

    expect(await screen.findByText('18 hours · 45 mins')).toBeInTheDocument()
    expect(screen.getByText('Issues created')).toBeInTheDocument()
    expect(screen.getByText('Issues assigned')).toBeInTheDocument()
    expect(screen.getByText('Hours this week')).toBeInTheDocument()
  })

  it('Issue Status แสดงทุกสถานะพร้อมจำนวน', async () => {
    renderPage()
    // 'Backlog'/'Todo' แสดงซ้ำในการ์ด My Issues — ใช้ findAll
    expect((await screen.findAllByText('Backlog')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Todo')).length).toBeGreaterThan(0)
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('Work Hour Analysis: ยอดรวม + เปลี่ยนช่วงเวลา', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('189 hours · 30 mins')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '1M' }))
    await waitFor(() =>
      expect(getWorkHourAnalysis).toHaveBeenCalledWith({
        data: { range: '1M' },
      }),
    )
  })

  it('My Issues + Recent entries + แท็บวันนี้', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('WEB-108')).toBeInTheDocument()
    expect(screen.getByText('Dark mode support')).toBeInTheDocument()

    expect(screen.getByText('APP-106')).toBeInTheDocument()
    expect(screen.getByText('running')).toBeInTheDocument()
    expect(screen.getByText('logged')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'events' }))
    expect(
      await screen.findByText(/ยังไม่มี events/),
    ).toBeInTheDocument()
  })
})

describe('DashboardPage — Time Tracker', () => {
  it('ยังไม่ได้เลือกโปรเจกต์ → ปุ่ม Start disabled', async () => {
    renderPage()
    expect(await screen.findByText('Time Tracker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start/ })).toBeDisabled()
  })

  it('มี timer กำลังวิ่ง → แสดงข้อมูล + กด Stop เรียก stopTimer + toast', async () => {
    const user = userEvent.setup()
    vi.mocked(stopTimer).mockResolvedValue({} as never)
    state.running = {
      id: 9,
      projectKey: 'WEB',
      issueNumber: 102,
      issueTitle: 'Finalize design tokens',
      note: null,
      startedAt: new Date().toISOString(),
    }
    renderPage()

    expect(await screen.findByText(/WEB-102/)).toBeInTheDocument()
    expect(
      screen.getByText(/Finalize design tokens/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Stop/ }))

    await waitFor(() =>
      expect(stopTimer).toHaveBeenCalledWith({ data: { entryId: 9 } }),
    )
    expect(
      (await screen.findAllByText('หยุดจับเวลาและบันทึกรายการแล้ว')).length,
    ).toBeGreaterThan(0)
  })

  it('เริ่มจับเวลา: เลือกโปรเจกต์ → Start → startTimer ถูกเรียก + toast', async () => {
    const user = userEvent.setup()
    vi.mocked(startTimer).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('Time Tracker')

    await user.click(screen.getByRole('combobox', { name: 'Project' }))
    await user.click(
      await screen.findByRole('option', { name: /Website Revamp/ }),
    )

    await user.click(screen.getByRole('button', { name: /Start/ }))

    await waitFor(() =>
      expect(startTimer).toHaveBeenCalledWith({
        data: { projectId: 16, issueId: undefined, note: undefined },
      }),
    )
    expect(
      (await screen.findAllByText('เริ่มจับเวลาแล้ว')).length,
    ).toBeGreaterThan(0)
  })

  it('เลือก issue ก่อน start → startTimer ได้ issueId + ใส่ note', async () => {
    const user = userEvent.setup()
    vi.mocked(startTimer).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('Time Tracker')

    await user.click(screen.getByRole('combobox', { name: 'Project' }))
    await user.click(
      await screen.findByRole('option', { name: /Website Revamp/ }),
    )

    const issueSelect = await screen.findByRole('combobox', {
      name: 'Issue (optional)',
    })
    await user.click(issueSelect)
    await user.click(await screen.findByRole('option', { name: /Dark mode/ }))
    await user.type(
      screen.getByPlaceholderText('What are you working on?'),
      'งานดีไซน์',
    )

    await user.click(screen.getByRole('button', { name: /Start/ }))
    await waitFor(() =>
      expect(startTimer).toHaveBeenCalledWith({
        data: { projectId: 16, issueId: 108, note: 'งานดีไซน์' },
      }),
    )
  })

  it('หยุดจับเวลา fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(stopTimer).mockRejectedValue(new Error('save พัง'))
    state.running = {
      id: 9,
      projectKey: 'WEB',
      issueNumber: null,
      issueTitle: null,
      note: 'โน้ต',
      startedAt: new Date().toISOString(),
    }
    renderPage()
    await screen.findByRole('button', { name: /Stop/ })

    await user.click(screen.getByRole('button', { name: /Stop/ }))

    expect(
      await screen.findByText('หยุดจับเวลาไม่สำเร็จ'),
    ).toBeInTheDocument()
  })

  it('เริ่มจับเวลา fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(startTimer).mockRejectedValue(new Error('มี timer ค้างอยู่'))
    renderPage()
    await screen.findByText('Time Tracker')

    await user.click(screen.getByRole('combobox', { name: 'Project' }))
    await user.click(
      await screen.findByRole('option', { name: /Website Revamp/ }),
    )
    await user.click(screen.getByRole('button', { name: /Start/ }))

    expect(
      await screen.findByText('เริ่มจับเวลาไม่สำเร็จ'),
    ).toBeInTheDocument()
  })

  it('entry สั้นกว่า 1 ชั่วโมงแสดงหน่วยนาที', async () => {
    vi.mocked(listMyEntries).mockResolvedValue([
      {
        id: 950,
        workDate: '2026-09-19',
        projectKey: 'WEB',
        issueNumber: null,
        issueTitle: null,
        durationMinutes: 45,
        running: false,
      },
    ] as never)
    renderPage()

    expect(await screen.findByText('45 mins')).toBeInTheDocument()
  })
})

describe('DashboardPage — เติม branch ครบ', () => {
  it('ไม่มี session → header ไม่มีชื่อ + ไม่ prefetch my-issues', async () => {
    state.session = null as never
    renderPage()
    expect(
      await screen.findByText('ภาพรวมงานและชั่วโมงทำงาน'),
    ).toBeInTheDocument()
    expect(listIssues).not.toHaveBeenCalled()
    // restore กัน session null ไหลไป test อื่น
    state.session = {
      user: { id: 'u8', name: 'Nok Member', role: 'member' },
    }
  })

  it('statusCounts ขาดสถานะบางตัว → แสดง 0', async () => {
    vi.mocked(getDashboardCounts).mockResolvedValue({
      created: 1,
      assigned: 1,
      statusCounts: { backlog: 1 },
    })
    renderPage()
    expect(await screen.findByText('Issues created')).toBeInTheDocument()
    expect((await screen.findAllByText('0')).length).toBe(4)
  })

  it('running timer ไม่มีชื่อ issue/note → แสดง Working…', async () => {
    state.running = {
      id: 9,
      projectKey: 'WEB',
      issueNumber: null,
      issueTitle: null,
      note: null,
      startedAt: new Date().toISOString(),
    }
    renderPage()
    expect(await screen.findByText(/WEB\s*Working…/)).toBeInTheDocument()
  })

  it('startTimer fail ด้วย non-Error → toast แสดง', async () => {
    const user = userEvent.setup()
    vi.mocked(startTimer).mockRejectedValue('boom')
    renderPage()
    await screen.findByText('Time Tracker')

    await user.click(screen.getByRole('combobox', { name: 'Project' }))
    await user.click(await screen.findByRole('option', { name: /Website Revamp/ }))
    await user.click(screen.getByRole('button', { name: /Start/ }))

    expect(
      (await screen.findAllByText('เริ่มจับเวลาไม่สำเร็จ')).length,
    ).toBeGreaterThan(0)
  })

  it('stopTimer fail ด้วย non-Error → toast แสดง', async () => {
    const user = userEvent.setup()
    vi.mocked(stopTimer).mockRejectedValue('boom')
    state.running = {
      id: 9,
      projectKey: 'WEB',
      issueNumber: 102,
      issueTitle: 'Finalize design tokens',
      note: null,
      startedAt: new Date().toISOString(),
    }
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Stop/ }))
    expect(
      (await screen.findAllByText('หยุดจับเวลาไม่สำเร็จ')).length,
    ).toBeGreaterThan(0)
  })

  it('my issues ว่าง → empty state', async () => {
    vi.mocked(listIssues).mockResolvedValue([] as never)
    renderPage()
    expect(
      await screen.findByText('ไม่มี issue ที่มอบหมายให้คุณ'),
    ).toBeInTheDocument()
  })

  it('recent entries กำลังโหลด → skeleton แถว', async () => {
    vi.mocked(listMyEntries).mockReturnValue(new Promise(() => {}) as never)
    renderPage()
    expect(await screen.findByText('Recent Time Entries')).toBeInTheDocument()
    expect(document.querySelectorAll('tbody tr').length).toBeGreaterThan(0)
  })

  it('Today: แท็บ focus → placeholder', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Today')
    await user.click(screen.getByRole('button', { name: 'focus' }))
    expect(
      await screen.findByText(/ตั้ง focus time เพื่อบล็อกช่วงทำงานสมาธิ/),
    ).toBeInTheDocument()
  })
})
