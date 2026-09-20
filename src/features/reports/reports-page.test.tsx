import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@testing-library/react'

import { ReportsPage } from './reports-page'
import { getWorkHourReport } from '@/features/time-entries/time-entries.functions'

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@/features/time-entries/time-entries.functions', () => ({
  getWorkHourReport: vi.fn(),
}))

const reportFixture = {
  range: '1M',
  rows: [
    {
      userId: 'u8',
      userName: 'Nok Member',
      projectKey: 'WEB',
      projectName: 'Website Revamp',
      minutes: 105,
    },
    {
      userId: 'u8',
      userName: 'Nok Member',
      projectKey: 'APP',
      projectName: 'Mobile App',
      minutes: 45,
    },
    {
      userId: 'u2',
      userName: 'Mana Manager',
      projectKey: 'WEB',
      projectName: 'Website Revamp',
      minutes: 120,
    },
  ],
  totalMinutes: 270,
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <ReportsPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(getWorkHourReport).mockResolvedValue(reportFixture as never)
})

describe('ReportsPage', () => {
  it('แสดงตาราง คน×โปรเจกต์ พร้อมยอดรวมต่อคนและทั้งหมด', async () => {
    renderPage()

    expect((await screen.findAllByText('Nok Member')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('WEB').length).toBe(2)
    expect(screen.getByText('Mobile App')).toBeInTheDocument()
    expect(screen.getByText('Mana Manager')).toBeInTheDocument()

    // แถวรายการ: 1h 45m, 45m, 2h
    expect(screen.getByText('1h 45m')).toBeInTheDocument()
    expect(screen.getByText('45m')).toBeInTheDocument()
    expect(screen.getAllByText('2h').length).toBe(2) // แถว 120m + รวม Mana

    // subtotal ต่อคน + รวมทั้งหมด (270 นาที = 4h 30m)
    expect(screen.getByText('รวม Nok Member')).toBeInTheDocument()
    expect(screen.getByText('รวม Mana Manager')).toBeInTheDocument()
    expect(screen.getByText('ทั้งหมด')).toBeInTheDocument()
    expect(screen.getByText('รวม 4h 30m')).toBeInTheDocument()
  })

  it('เปลี่ยนช่วงเวลา → เรียกด้วย range ใหม่', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findAllByText('Nok Member')

    await user.click(screen.getByRole('button', { name: '2W' }))

    await waitFor(() =>
      expect(getWorkHourReport).toHaveBeenCalledWith({
        data: { range: '2W' },
      }),
    )
  })

  it('ไม่มีข้อมูล → empty state + ปุ่ม export disabled', async () => {
    vi.mocked(getWorkHourReport).mockResolvedValue({
      range: '1M',
      rows: [],
      totalMinutes: 0,
    } as never)
    renderPage()

    expect(
      await screen.findByText(/ยังไม่มีข้อมูลเวลาในช่วงนี้/),
    ).toBeInTheDocument()
    const exportBtn = screen.getByRole('button', { name: /Export CSV/ })
    expect(exportBtn).toBeDisabled()
  })

  it('กด Export CSV → สร้าง blob และ trigger ดาวน์โหลด', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:report')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    renderPage()
    await screen.findAllByText('Nok Member')

    await user.click(screen.getByRole('button', { name: /Export CSV/ }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report')

    // เนื้อหา CSV: header + 3 แถว + ชื่อคน/โปรเจกต์ + duration
    const blob = createObjectURL.mock.calls[0]![0] as Blob
    const csv = await blob.text()
    expect(csv).toContain('user,project_key,project_name,minutes,duration')
    expect(csv).toContain('Nok Member,WEB,Website Revamp,105,1h 45m')
    expect(csv).toContain('Mana Manager,WEB,Website Revamp,120,2h')

    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    clickSpy.mockRestore()
  })

  it('ชื่อที่มี comma ถูก escape ใน CSV', async () => {
    const user = userEvent.setup()
    vi.mocked(getWorkHourReport).mockResolvedValue({
      range: '1M',
      rows: [
        {
          userId: 'u9',
          userName: 'Somchai, Admin "SA"',
          projectKey: 'WEB',
          projectName: 'Website Revamp',
          minutes: 60,
        },
      ],
      totalMinutes: 60,
    } as never)
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:x')
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    renderPage()
    await screen.findAllByText(/Somchai, Admin/)

    await user.click(screen.getByRole('button', { name: /Export CSV/ }))
    const blob = createObjectURL.mock.calls[0]![0] as Blob
    const csv = await blob.text()
    expect(csv).toContain('"Somchai, Admin ""SA""",WEB')

    createObjectURL.mockRestore()
    clickSpy.mockRestore()
  })
})

describe('within table structure', () => {
  it('มี thead และ tfoot ครบ', async () => {
    renderPage()
    await screen.findAllByText('Nok Member')
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3)
    expect(document.querySelector('tfoot')).not.toBeNull()
  })
})
