import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'

import { LogWorkDrawer } from './log-work-drawer'
import { addManualEntry } from './time-entries.functions'
import { Toaster } from '@/components/ui/sonner'

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('./time-entries.functions', () => ({
  addManualEntry: vi.fn(),
}))

const issue = { id: 102, key: 'WEB-102', title: 'Finalize design tokens' }

function renderDrawer() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <LogWorkDrawer projectId={16} issue={issue} />
      <Toaster />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(addManualEntry).mockReset()
})

describe('LogWorkDrawer', () => {
  it('เปิด drawer แล้วเห็นชื่อ issue + ฟอร์ม', async () => {
    const user = userEvent.setup()
    renderDrawer()

    await user.click(screen.getByRole('button', { name: /Log/ }))
    expect(await screen.findByRole('heading', { name: 'Log work' })).toBeInTheDocument()
    expect(
      screen.getByText('WEB-102 · Finalize design tokens'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Time spent')).toBeInTheDocument()
    // วันที่ default = วันนี้ตาม local timezone (เหมือน todayInput ใน component)
    const now = new Date()
    const localToday = new Date(
      now.getTime() - now.getTimezoneOffset() * 60_000,
    )
      .toISOString()
      .slice(0, 10)
    expect(screen.getByLabelText('Work date')).toHaveValue(localToday)
  })

  it('พิมพ์ 1h 45m → preview เป็นนาที', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await screen.findByRole('heading', { name: 'Log work' })

    await user.type(screen.getByLabelText('Time spent'), '1h 45m')
    expect(await screen.findByText('= 1h 45m (105 นาที)')).toBeInTheDocument()
  })

  it('พิมพ์รูปแบบไม่ถูกต้อง → hint และ validate ตอน submit', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await screen.findByRole('heading', { name: 'Log work' })

    await user.type(screen.getByLabelText('Time spent'), 'abc')
    expect(
      await screen.findByText(/ยังอ่านค่าไม่ได้/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log work' }))
    expect(
      await screen.findByText(/รูปแบบไม่ถูกต้อง/),
    ).toBeInTheDocument()
    expect(addManualEntry).not.toHaveBeenCalled()
  })

  it('submit สำเร็จ → addManualEntry ได้ minutes ที่แปลงแล้ว + toast + ปิด', async () => {
    const user = userEvent.setup()
    vi.mocked(addManualEntry).mockResolvedValue({} as never)
    renderDrawer()
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await screen.findByRole('heading', { name: 'Log work' })

    await user.type(screen.getByLabelText('Time spent'), '1:45')
    await user.type(screen.getByLabelText(/Note/), 'งานดีไซน์')
    await user.click(screen.getByRole('button', { name: 'Log work' }))

    await waitFor(() =>
      expect(addManualEntry).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 16,
          issueId: 102,
          minutes: 105,
          note: 'งานดีไซน์',
        }),
      }),
    )
    expect(
      (await screen.findAllByText(/บันทึกเวลา 1h 45m ให้ WEB-102/)).length,
    ).toBeGreaterThan(0)
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Log work' })).not.toBeInTheDocument(),
    )
  })

  it('submit fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(addManualEntry).mockRejectedValue(new Error('DB ล่ม'))
    renderDrawer()
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await screen.findByRole('heading', { name: 'Log work' })

    await user.type(screen.getByLabelText('Time spent'), '30m')
    await user.click(screen.getByRole('button', { name: 'Log work' }))

    expect(await screen.findByText('บันทึกเวลาไม่สำเร็จ')).toBeInTheDocument()
    expect(await screen.findByText('DB ล่ม')).toBeInTheDocument()
  })

  it('กด Cancel → ปิด drawer ไม่เรียก server', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByRole('button', { name: /Log/ }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Log work' })).not.toBeInTheDocument(),
    )
    expect(addManualEntry).not.toHaveBeenCalled()
  })
})
