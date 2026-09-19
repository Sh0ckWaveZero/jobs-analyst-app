import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@testing-library/react'

import { ProjectDetailPage } from './project-detail-page'
import { getProjects } from './projects.functions'
import { addManualEntry } from '@/features/time-entries/time-entries.functions'
import {
  createIssue,
  deleteIssue,
  listIssues,
  updateIssue,
} from '@/features/issues/issues.functions'

import { Toaster } from '@/components/ui/sonner'

const sessionRef = vi.hoisted(() => ({
  current: {
    user: { id: 'u1', name: 'Somchai Admin', role: 'admin' },
  },
}))

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock('@/features/auth/auth-client', () => ({
  authClient: { useSession: () => ({ data: sessionRef.current }) },
}))
vi.mock('./projects.functions', () => ({
  getProjects: vi.fn(),
}))
vi.mock('@/features/issues/issues.functions', () => ({
  listIssues: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  deleteIssue: vi.fn(),
}))
vi.mock('@/features/users/users.functions', () => ({
  getAssignableUsers: vi.fn(async () => [
    { id: 'u8', name: 'Nok Member' },
  ]),
}))
vi.mock('@/features/time-entries/time-entries.functions', () => ({
  addManualEntry: vi.fn(),
}))

const projectsFixture = {
  projects: [
    {
      id: 16,
      key: 'WEB',
      name: 'Website Revamp',
      description: 'เว็บใหม่',
      ownerId: 'u2',
      ownerName: 'Mana Manager',
      openIssues: 2,
      totalMinutes: 4245,
    },
  ],
}

const issuesFixture = [
  {
    id: 102,
    key: 'WEB-102',
    projectId: 16,
    projectName: 'Website Revamp',
    title: 'Finalize design system tokens',
    status: 'in_progress',
    priority: 'high',
    reporterId: 'u9',
    assigneeId: 'u8',
    assigneeName: 'Nok Member',
    labels: ['design', 'frontend'],
    dueDate: '2026-10-08',
    totalMinutes: 100,
  },
]

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <ProjectDetailPage projectId="16" />
      <Toaster />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(getProjects).mockResolvedValue(projectsFixture as never)
  vi.mocked(listIssues).mockResolvedValue(issuesFixture as never)
  vi.mocked(createIssue).mockReset()
  vi.mocked(updateIssue).mockReset()
  vi.mocked(deleteIssue).mockReset()
  sessionRef.current = { user: { id: 'u1', name: 'Somchai Admin', role: 'admin' } }
})

describe('ProjectDetailPage', () => {
  it('แสดงหัวโปรเจกต์และตาราง issues ครบ', async () => {
    renderPage()

    expect(await screen.findByText('Website Revamp')).toBeInTheDocument()
    expect(screen.getByText('WEB')).toBeInTheDocument()
    expect(
      screen.getByText('Finalize design system tokens'),
    ).toBeInTheDocument()
    expect(screen.getByText('WEB-102')).toBeInTheDocument()
    expect(screen.getByText('Nok Member')).toBeInTheDocument()
    expect(screen.getByText('design')).toBeInTheDocument()
    expect(screen.getByText('frontend')).toBeInTheDocument()
    expect(screen.getByText('2026-10-08')).toBeInTheDocument()
    expect(screen.getByText('1h 40m')).toBeInTheDocument() // 100 นาที
  })

  it('โปรเจกต์ไม่มี issue → empty state', async () => {
    vi.mocked(listIssues).mockResolvedValue([] as never)
    renderPage()
    expect(
      await screen.findByText('ยังไม่มี issue ในโปรเจกต์นี้'),
    ).toBeInTheDocument()
  })

  it('member ที่ไม่เกี่ยวข้องไม่เห็นปุ่ม Log/Edit/delete', async () => {
    sessionRef.current = {
      user: { id: 'u77', name: 'Outsider', role: 'member' },
    }
    renderPage()
    await screen.findByText('WEB-102')
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('delete')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Log/ }),
    ).not.toBeInTheDocument()
  })

  it('Log work จากแถว issue → addManualEntry ได้เวลาที่แปลงจาก 1h 45m', async () => {
    const user = userEvent.setup()
    vi.mocked(addManualEntry).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('WEB-102')

    await user.click(screen.getByRole('button', { name: /Log/ }))
    expect(
      await screen.findByRole('heading', { name: 'Log work' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('WEB-102 · Finalize design system tokens'),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Time spent'), '1h 45m')
    expect(await screen.findByText('= 1h 45m (105 นาที)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log work' }))

    await waitFor(() =>
      expect(addManualEntry).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 16,
          issueId: 102,
          minutes: 105,
        }),
      }),
    )
    expect(
      (await screen.findAllByText(/บันทึกเวลา 1h 45m ให้ WEB-102/)).length,
    ).toBeGreaterThan(0)
  })

  it('สร้าง issue ผ่าน drawer → createIssue ถูกเรียก + toast', async () => {
    const user = userEvent.setup()
    vi.mocked(createIssue).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('WEB-102')

    await user.click(screen.getByRole('button', { name: /New issue/ }))
    expect(await screen.findByText(/สร้าง issue ใหม่/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Title'), 'ทำ favicon ใหม่')
    await user.click(screen.getByRole('button', { name: 'Create issue' }))

    await waitFor(() => expect(createIssue).toHaveBeenCalled())
    expect(vi.mocked(createIssue).mock.calls[0]![0]).toMatchObject({
      data: {
        projectId: 16,
        title: 'ทำ favicon ใหม่',
        priority: 'medium',
        assigneeId: undefined,
        dueDate: undefined,
      },
    })
    expect(await screen.findByText('สร้าง issue แล้ว')).toBeInTheDocument()
  })

  it('แก้ไข issue ผ่าน drawer → updateIssue ถูกเรียกด้วยค่าจากฟอร์ม', async () => {
    const user = userEvent.setup()
    vi.mocked(updateIssue).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('WEB-102')

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(await screen.findByText('Edit issue')).toBeInTheDocument()

    const title = screen.getByLabelText('Title')
    expect(title).toHaveValue('Finalize design system tokens') // prefill

    await user.clear(title)
    await user.type(title, 'ปรับชื่อใหม่')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateIssue).toHaveBeenCalled())
    expect(vi.mocked(updateIssue).mock.calls[0]![0]).toMatchObject({
      data: {
        id: 102,
        title: 'ปรับชื่อใหม่',
        status: 'in_progress',
        priority: 'high',
        assigneeId: 'u8',
      },
    })
    expect(
      await screen.findByText('บันทึกการแก้ไข issue แล้ว'),
    ).toBeInTheDocument()
  })

  it('ลบ issue → deleteIssue ถูกเรียก + toast', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteIssue).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('WEB-102')

    await user.click(screen.getByRole('button', { name: 'delete' }))

    await waitFor(() =>
      expect(deleteIssue).toHaveBeenCalledWith({ data: { id: 102 } }),
    )
    expect(await screen.findByText('ลบ issue แล้ว')).toBeInTheDocument()
  })

  it('เปลี่ยนสถานะผ่าน select ในตาราง → updateIssue + toast', async () => {
    const user = userEvent.setup()
    vi.mocked(updateIssue).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('WEB-102')

    const row = screen.getByRole('row', { name: /WEB-102/ })
    await user.click(within(row).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Done' }))

    await waitFor(() =>
      expect(updateIssue).toHaveBeenCalledWith({ data: { id: 102, status: 'done' } }),
    )
    expect(
      await screen.findByText('อัปเดตสถานะเป็น Done แล้ว'),
    ).toBeInTheDocument()
  })

  it('เปลี่ยนสถานะ fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(updateIssue).mockRejectedValue(new Error('สถานะล็อก'))
    renderPage()
    await screen.findByText('WEB-102')

    const row = screen.getByRole('row', { name: /WEB-102/ })
    await user.click(within(row).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Done' }))

    expect(await screen.findByText('เปลี่ยนสถานะไม่สำเร็จ')).toBeInTheDocument()
  })

  it('ลบ issue fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteIssue).mockRejectedValue(new Error('ลบไม่ได้'))
    renderPage()
    await screen.findByText('WEB-102')

    await user.click(screen.getByRole('button', { name: 'delete' }))

    expect(await screen.findByText('ลบ issue ไม่สำเร็จ')).toBeInTheDocument()
  })

  it('สร้าง issue พร้อม labels → แปลงเป็น array + toast', async () => {
    const user = userEvent.setup()
    vi.mocked(createIssue).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('WEB-102')

    await user.click(screen.getByRole('button', { name: /New issue/ }))
    await screen.findByText(/สร้าง issue ใหม่/)

    await user.type(screen.getByLabelText('Title'), 'ทำ sitemap')
    await user.type(screen.getByLabelText(/Labels/), 'seo, content')
    await user.click(screen.getByRole('button', { name: 'Create issue' }))

    await waitFor(() =>
      expect(createIssue).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 16,
          title: 'ทำ sitemap',
          labels: ['seo', 'content'],
        }),
      }),
    )
    // toast จาก test ก่อนหน้าอาจยังค้างใน sonner store — ใช้ findAll
    expect(
      (await screen.findAllByText('สร้าง issue แล้ว')).length,
    ).toBeGreaterThan(0)
  })

  it('สร้าง issue fail → toast.error + inline', async () => {
    const user = userEvent.setup()
    vi.mocked(createIssue).mockRejectedValue(new Error('โควตาเต็ม'))
    renderPage()
    await screen.findByText('WEB-102')

    await user.click(screen.getByRole('button', { name: /New issue/ }))
    await screen.findByText(/สร้าง issue ใหม่/)
    await user.type(screen.getByLabelText('Title'), 'งานใหม่')
    await user.click(screen.getByRole('button', { name: 'Create issue' }))

    expect(await screen.findByText('สร้าง issue ไม่สำเร็จ')).toBeInTheDocument()
    expect(await screen.findAllByText('โควตาเต็ม')).not.toHaveLength(0)
  })

  it('แก้ไข issue พร้อม labels ว่าง → labels เป็น [] + แก้ fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(updateIssue).mockRejectedValueOnce(new Error('conflict'))
    renderPage()
    await screen.findByText('WEB-102')

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await screen.findByText('Edit issue')

    await user.clear(screen.getByLabelText(/Labels/))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateIssue).toHaveBeenCalled())
    expect(vi.mocked(updateIssue).mock.calls[0]![0]).toMatchObject({
      data: expect.objectContaining({ labels: [] }),
    })
    expect(await screen.findByText('แก้ไข issue ไม่สำเร็จ')).toBeInTheDocument()
  })

  it('กด Cancel ใน drawer (สร้าง/แก้ไข) → ปิดโดยไม่เรียก server fn', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('WEB-102')

    await user.click(screen.getByRole('button', { name: /New issue/ }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Create issue' })).not.toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument(),
    )

    expect(createIssue).not.toHaveBeenCalled()
    expect(updateIssue).not.toHaveBeenCalled()
  })
})
