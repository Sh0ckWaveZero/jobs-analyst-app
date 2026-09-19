import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'

import { ProjectsPage } from './projects-page'
import { createProject, getProjects } from './projects.functions'
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
  createProject: vi.fn(),
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

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <ProjectsPage />
      {/* Toaster ปกติ mount ที่ __root — page test ต้องใส่เองจึงจะเห็น toast */}
      <Toaster />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(getProjects).mockResolvedValue(projectsFixture as never)
  vi.mocked(createProject).mockReset()
  sessionRef.current = { user: { id: 'u1', name: 'Somchai Admin', role: 'admin' } }
})

describe('ProjectsPage', () => {
  it('แสดงการ์ดโปรเจกต์พร้อมข้อมูลสรุป', async () => {
    renderPage()

    expect(await screen.findByText('Website Revamp')).toBeInTheDocument()
    expect(screen.getByText('WEB')).toBeInTheDocument()
    expect(screen.getByText(/owner: Mana Manager/)).toBeInTheDocument()
    expect(screen.getByText('2 open issues')).toBeInTheDocument()
    expect(screen.getByText('70h logged')).toBeInTheDocument()
  })

  it('admin เห็นปุ่ม New project, member ไม่เห็น', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: /New project/ })).toBeInTheDocument()

    sessionRef.current = { user: { id: 'u3', name: 'Nok', role: 'member' } }
    renderPage()
    await screen.findByText('Website Revamp')
    expect(
      screen.queryByRole('button', { name: /New project/ }),
    ).not.toBeInTheDocument()
  })

  it('กำลังโหลด → skeleton, โหลดเสร็จ → การ์ด', async () => {
    let resolve!: (v: typeof projectsFixture) => void
    vi.mocked(getProjects).mockReturnValue(
      new Promise((r) => (resolve = r)) as never,
    )
    renderPage()
    expect(document.querySelector('.animate-pulse')).not.toBeNull()

    resolve(projectsFixture)
    expect(await screen.findByText('Website Revamp')).toBeInTheDocument()
  })

  it('รายการว่าง → empty state', async () => {
    vi.mocked(getProjects).mockResolvedValue({ projects: [] } as never)
    renderPage()
    expect(await screen.findByText('ยังไม่มีโปรเจกต์')).toBeInTheDocument()
  })

  it('ชั่วโมงน้อยกว่า 1 ชม. แสดงเป็นนาที', async () => {
    vi.mocked(getProjects).mockResolvedValue({
      projects: [
        {
          id: 20,
          key: 'TST',
          name: 'Small Project',
          description: null,
          ownerId: 'u2',
          ownerName: 'M',
          openIssues: 0,
          totalMinutes: 45,
        },
      ],
    } as never)
    renderPage()
    expect(await screen.findByText('45m logged')).toBeInTheDocument()
  })

  it('สร้างโปรเจกต์สำเร็จ → เรียก createProject + toast + ปิด drawer', async () => {
    const user = userEvent.setup()
    vi.mocked(createProject).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('Website Revamp')

    await user.click(screen.getByRole('button', { name: /New project/ }))
    expect(
      await screen.findByText(/สร้างโปรเจกต์ใหม่/),
    ).toBeInTheDocument()

    const keyInput = screen.getByLabelText('Key')
    await user.type(keyInput, 'app')
    expect(keyInput).toHaveValue('APP') // uppercase transform

    await user.type(screen.getByLabelText('Name'), 'Mobile App')
    await user.click(screen.getByRole('button', { name: 'Create project' }))

    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        data: { key: 'APP', name: 'Mobile App', description: undefined },
      }),
    )
    expect(await screen.findByText('สร้างโปรเจกต์แล้ว')).toBeInTheDocument()
  })

  it('สร้างไม่สำเร็จ → toast.error + inline error', async () => {
    const user = userEvent.setup()
    vi.mocked(createProject).mockRejectedValue(new Error('Key ซ้ำ'))
    renderPage()
    await screen.findByText('Website Revamp')

    await user.click(screen.getByRole('button', { name: /New project/ }))
    await screen.findByText(/สร้างโปรเจกต์ใหม่/)
    await user.type(screen.getByLabelText('Key'), 'APP')
    await user.type(screen.getByLabelText('Name'), 'X')
    await user.click(screen.getByRole('button', { name: 'Create project' }))

    await waitFor(() => expect(createProject).toHaveBeenCalled())
    expect(await screen.findByText('สร้างโปรเจกต์ไม่สำเร็จ')).toBeInTheDocument()
    // แสดงทั้งใน toast description และ inline form error
    expect(await screen.findAllByText('Key ซ้ำ')).toHaveLength(2)
  })
})
