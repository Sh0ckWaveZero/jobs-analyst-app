import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'

import { CommandMenu } from './command-menu'
import { getProjects } from '@/features/projects/projects.functions'
import { listIssues } from '@/features/issues/issues.functions'

const state = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => state.navigate,
}))
vi.mock('@/features/projects/projects.functions', () => ({
  getProjects: vi.fn(),
}))
vi.mock('@/features/issues/issues.functions', () => ({
  listIssues: vi.fn(),
}))

const projectsFixture = {
  projects: [{ id: 16, key: 'WEB', name: 'Website Revamp', ownerId: 'u2' }],
}

const issuesFixture = [
  {
    id: 102,
    key: 'WEB-102',
    projectId: 16,
    title: 'Finalize design system tokens',
  },
]

function renderMenu() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <CommandMenu />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  state.navigate.mockClear()
  vi.mocked(getProjects).mockResolvedValue(projectsFixture as never)
  vi.mocked(listIssues).mockResolvedValue(issuesFixture as never)
})

describe('CommandMenu', () => {
  it('เปิดจากปุ่ม Search เห็น Pages เสมอ ยังไม่ยิง query จนกว่าจะเปิด', async () => {
    const user = userEvent.setup()
    renderMenu()
    expect(getProjects).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Search/ }))
    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
    expect(await screen.findByText('Website Revamp')).toBeInTheDocument()
    expect(
      await screen.findByText('Finalize design system tokens'),
    ).toBeInTheDocument()
  })

  it('เปิดด้วย ⌘K แล้วเลือกโปรเจกต์ → navigate ไป /projects/$projectId', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.keyboard('{Meta>}k{/Meta}')
    const project = await screen.findByText('Website Revamp')
    await user.click(project)

    expect(state.navigate).toHaveBeenCalledWith({
      to: '/projects/$projectId',
      params: { projectId: '16' },
    })
  })

  it('เลือก issue → navigate ไปโปรเจกต์ของ issue นั้น', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: /Search/ }))
    const issue = await screen.findByText('Finalize design system tokens')
    await user.click(issue)

    expect(state.navigate).toHaveBeenCalledWith({
      to: '/projects/$projectId',
      params: { projectId: '16' },
    })
  })

  it('พิมพ์กรอง → เหลือเฉพาะรายการที่ตรง', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: /Search/ }))
    await screen.findByText('Website Revamp')

    await user.type(screen.getByPlaceholderText(/ค้นหา/), 'WEB-102')
    expect(
      await screen.findByText('Finalize design system tokens'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})
