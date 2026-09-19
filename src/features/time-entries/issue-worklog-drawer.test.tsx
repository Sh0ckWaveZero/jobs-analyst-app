import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@testing-library/react'

import { IssueWorklogDrawer } from './issue-worklog-drawer'
import {
  deleteEntry,
  listIssueEntries,
  updateEntry,
} from './time-entries.functions'
import { Toaster } from '@/components/ui/sonner'

const sessionRef = vi.hoisted(() => ({
  current: {
    user: { id: 'u8', name: 'Nok Member', role: 'member' },
  },
}))

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@/features/auth/auth-client', () => ({
  authClient: { useSession: () => ({ data: sessionRef.current }) },
}))
vi.mock('./time-entries.functions', () => ({
  listIssueEntries: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}))

const issue = { id: 102, key: 'WEB-102', title: 'Finalize design tokens' }

// u8 = เจ้าของรายการแรก, u2 = คนอื่น
const entriesFixture = [
  {
    id: 900,
    userId: 'u8',
    userName: 'Nok Member',
    durationMinutes: 105,
    workDate: '2026-09-19',
    note: 'งานดีไซน์',
    startedAt: new Date('2026-09-19T09:00:00Z').toISOString(),
    running: false,
  },
  {
    id: 901,
    userId: 'u2',
    userName: 'Mana Manager',
    durationMinutes: 60,
    workDate: '2026-09-18',
    note: null,
    startedAt: new Date('2026-09-18T09:00:00Z').toISOString(),
    running: true,
  },
]

function renderDrawer() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <IssueWorklogDrawer issue={issue} totalMinutes={165} />
      <Toaster />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(listIssueEntries).mockResolvedValue(entriesFixture as never)
  vi.mocked(updateEntry).mockReset()
  vi.mocked(deleteEntry).mockReset()
  sessionRef.current = { user: { id: 'u8', name: 'Nok', role: 'member' } }
})

describe('IssueWorklogDrawer', () => {
  it('trigger แสดงเวลารวม และเปิดแล้วเห็นรายการครบ', async () => {
    const user = userEvent.setup()
    renderDrawer()

    expect(screen.getByText('2h 45m')).toBeInTheDocument() // 165 นาที

    await user.click(screen.getByText('2h 45m'))
    expect(
      await screen.findByRole('heading', { name: 'Work log' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('WEB-102 · Finalize design tokens'),
    ).toBeInTheDocument()
    expect(screen.getByText('1h 45m')).toBeInTheDocument() // รายการ 900
    expect(screen.getByText('1h')).toBeInTheDocument() // รายการ 901
    expect(screen.getByText('งานดีไซน์')).toBeInTheDocument()
    expect(screen.getByText('running')).toBeInTheDocument()
    expect(listIssueEntries).toHaveBeenCalledWith({
      data: { issueId: 102 },
    })
  })

  it('ไม่มีรายการ → empty state', async () => {
    vi.mocked(listIssueEntries).mockResolvedValue([] as never)
    const user = userEvent.setup()
    renderDrawer()

    await user.click(screen.getByText('2h 45m'))
    expect(
      await screen.findByText('ยังไม่มีรายการเวลาใน issue นี้'),
    ).toBeInTheDocument()
  })

  it('เจ้าของรายการเห็นปุ่มแก้/ลบเฉพาะรายการตัวเอง', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('2h 45m'))

    const myEntry = screen.getByText('งานดีไซน์').closest(
      'div[class*="border"]',
    ) as HTMLElement
    const otherEntry = screen.getByText(/Mana Manager/).closest(
      'div[class*="border"]',
    ) as HTMLElement

    expect(within(myEntry).getByText('Edit')).toBeInTheDocument()
    expect(within(otherEntry).queryByText('Edit')).not.toBeInTheDocument()
  })

  it('admin เห็นปุ่มแก้/ลบทุกรายการ', async () => {
    sessionRef.current = {
      user: { id: 'u1', name: 'Somchai Admin', role: 'admin' },
    }
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('2h 45m'))

    expect(await screen.findAllByText('Edit')).toHaveLength(2)
    expect(await screen.findAllByText('delete')).toHaveLength(2)
  })

  it('แก้ไขรายการ: เปลี่ยนเป็น 30m → updateEntry + toast + ออกจากโหมดแก้', async () => {
    const user = userEvent.setup()
    vi.mocked(updateEntry).mockResolvedValue({} as never)
    renderDrawer()
    await user.click(screen.getByText('2h 45m'))

    await user.click(await screen.findByText('Edit'))
    const timeInput = await screen.findByLabelText('Time spent')
    expect(timeInput).toHaveValue('1h 45m') // prefill จากรายการ

    await user.clear(timeInput)
    await user.type(timeInput, '30m')
    expect(await screen.findByText('= 30m (30 นาที)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateEntry).toHaveBeenCalledWith({
        data: {
          id: 900,
          minutes: 30,
          workDate: '2026-09-19',
          note: 'งานดีไซน์',
        },
      }),
    )
    expect(await screen.findByText('แก้ไขรายการเวลาแล้ว')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('แก้ไขด้วยรูปแบบเวลาไม่ถูกต้อง → error ในฟอร์ม ไม่ยิง server', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('2h 45m'))

    await user.click(await screen.findByText('Edit'))
    const timeInput = await screen.findByLabelText('Time spent')
    await user.clear(timeInput)
    await user.type(timeInput, 'xyz')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText(/รูปแบบไม่ถูกต้อง/),
    ).toBeInTheDocument()
    expect(updateEntry).not.toHaveBeenCalled()
  })

  it('แก้ไข fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(updateEntry).mockRejectedValue(new Error('Forbidden'))
    renderDrawer()
    await user.click(screen.getByText('2h 45m'))

    await user.click(await screen.findByText('Edit'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('แก้ไขรายการไม่สำเร็จ')).toBeInTheDocument()
    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
  })

  it('แก้ไขครั้งแรกไม่ใส่เวลาเลย → preview ไม่แสดง แต่ submit ติด error', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('2h 45m'))

    await user.click(await screen.findByText('Edit'))
    const timeInput = await screen.findByLabelText('Time spent')
    await user.clear(timeInput)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/รูปแบบไม่ถูกต้อง/)).toBeInTheDocument()
  })

  it('ลบรายการ → deleteEntry + toast', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteEntry).mockResolvedValue({ ok: true } as never)
    renderDrawer()
    await user.click(screen.getByText('2h 45m'))

    await user.click(await screen.findByText('delete'))

    await waitFor(() =>
      expect(deleteEntry).toHaveBeenCalledWith({ data: { id: 900 } }),
    )
    expect(await screen.findByText('ลบรายการเวลาแล้ว')).toBeInTheDocument()
  })

  it('ลบ fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteEntry).mockRejectedValue(new Error('ลบไม่ได้'))
    renderDrawer()
    await user.click(screen.getByText('2h 45m'))

    await user.click(await screen.findByText('delete'))

    expect(await screen.findByText('ลบรายการไม่สำเร็จ')).toBeInTheDocument()
  })

  it('กด Cancel ในโหมดแก้ → กลับไปหน้า list ไม่เรียก server', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('2h 45m'))

    await user.click(await screen.findByText('Edit'))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(
      await screen.findByText('1h 45m'),
    ).toBeInTheDocument()
    expect(updateEntry).not.toHaveBeenCalled()
  })
})
