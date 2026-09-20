import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { format } from 'date-fns'

import { LogWorkDrawer } from './log-work-drawer'
import { addManualEntry } from './time-entries.functions'
import { Toaster } from '@/components/ui/sonner'

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('./time-entries.functions', () => ({
  addManualEntry: vi.fn(),
}))

const issue = {
  id: 102,
  key: 'WEB-102',
  title: 'Finalize design tokens',
  totalMinutes: 0,
  remainingEstimateMinutes: null as number | null,
}

function renderDrawer(overrides: Partial<typeof issue> = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <LogWorkDrawer projectId={16} issue={{ ...issue, ...overrides }} />
      <Toaster />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(addManualEntry).mockReset()
})

describe('LogWorkDrawer', () => {
  it('เปิด drawer แล้วเห็นชื่อ issue + ฟอร์มครบ', async () => {
    const user = userEvent.setup()
    renderDrawer()

    await user.click(screen.getByRole('button', { name: /Log/ }))
    expect(
      await screen.findByRole('heading', { name: 'Time tracking' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('WEB-102 · Finalize design tokens'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Time spent')).toBeInTheDocument()
    expect(screen.getByLabelText(/Time remaining/)).toBeInTheDocument()
    expect(screen.getByLabelText('Work description')).toBeInTheDocument()

    // วันที่ default = วันนี้ตาม local timezone (เหมือน todayInput ใน component)
    expect(screen.getByLabelText('Date started')).toHaveTextContent(
      format(new Date(), 'd MMM yyyy'),
    )
  })

  it('พิมพ์ 1h 45m ใน Time spent → progress bar และ preview อัปเดต', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await screen.findByRole('heading', { name: 'Time tracking' })

    await user.type(screen.getByLabelText('Time spent'), '1h 45m')
    expect(await screen.findByText('1h 45m logged')).toBeInTheDocument()
  })

  it('มี remaining estimate เดิม → Time remaining prefill และลดตาม Time spent', async () => {
    const user = userEvent.setup()
    renderDrawer({ remainingEstimateMinutes: 300 }) // 5h
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await screen.findByRole('heading', { name: 'Time tracking' })

    expect(screen.getByLabelText(/Time remaining/)).toHaveValue('5h')

    await user.type(screen.getByLabelText('Time spent'), '1h 30m')
    await waitFor(() =>
      expect(screen.getByLabelText(/Time remaining/)).toHaveValue('3h 30m'),
    )
  })

  it('แก้ Time remaining เองแล้ว → ไม่ auto-sync ตาม Time spent อีก', async () => {
    const user = userEvent.setup()
    renderDrawer({ remainingEstimateMinutes: 300 })
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await screen.findByRole('heading', { name: 'Time tracking' })

    const remaining = screen.getByLabelText(/Time remaining/)
    await user.clear(remaining)
    await user.type(remaining, '1h')
    await user.type(screen.getByLabelText('Time spent'), '30m')

    expect(remaining).toHaveValue('1h')
  })

  it('พิมพ์รูปแบบไม่ถูกต้อง → hint และ validate ตอน submit', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await screen.findByRole('heading', { name: 'Time tracking' })

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      await screen.findByText(/ระบุเวลาที่ใช้/),
    ).toBeInTheDocument()
    expect(addManualEntry).not.toHaveBeenCalled()
  })

  it('submit สำเร็จ → addManualEntry ได้ minutes/startTime/remaining ที่แปลงแล้ว + toast + ปิด', async () => {
    const user = userEvent.setup()
    vi.mocked(addManualEntry).mockResolvedValue({} as never)
    renderDrawer({ remainingEstimateMinutes: 300 })
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await screen.findByRole('heading', { name: 'Time tracking' })

    await user.type(screen.getByLabelText('Time spent'), '1:45')
    await user.type(screen.getByLabelText('Work description'), 'งานดีไซน์')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(addManualEntry).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 16,
          issueId: 102,
          minutes: 105,
          note: 'งานดีไซน์',
          remainingEstimateMinutes: 195, // 5h - 1h45m
        }),
      }),
    )
    expect(
      (await screen.findAllByText(/บันทึกเวลา 1h 45m ให้ WEB-102/)).length,
    ).toBeGreaterThan(0)
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Time tracking' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('submit fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(addManualEntry).mockRejectedValue(new Error('DB ล่ม'))
    renderDrawer()
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await screen.findByRole('heading', { name: 'Time tracking' })

    await user.type(screen.getByLabelText('Time spent'), '30m')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('บันทึกเวลาไม่สำเร็จ')).toBeInTheDocument()
    expect(await screen.findByText('DB ล่ม')).toBeInTheDocument()
  })

  it('กด Cancel → ปิด drawer ไม่เรียก server', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument(),
    )
    expect(addManualEntry).not.toHaveBeenCalled()
  })
})
