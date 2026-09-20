
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@testing-library/react'

import { UsersPage } from './users-page'
import {
  createDepartment,
  createUser,
  listDepartments,
  listUsers,
  updateUser,
} from './users.functions'
import { Toaster } from '@/components/ui/sonner'

const sessionRef = vi.hoisted(() => ({
  current: {
    user: { id: 'u1', name: 'Somchai Admin', role: 'admin' },
  },
}))

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@/features/auth/auth-client', () => ({
  authClient: { useSession: () => ({ data: sessionRef.current }) },
}))
vi.mock('./users.functions', () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  listDepartments: vi.fn(),
  createDepartment: vi.fn(),
  getAssignableUsers: vi.fn(),
}))

const usersFixture = [
  {
    id: 'u1',
    name: 'Somchai Admin',
    email: 'admin@pm.local',
    role: 'admin',
    departmentId: 14,
    departmentName: 'Engineering',
    createdAt: new Date('2026-07-16T02:00:00.000Z'),
  },
  {
    id: 'u2',
    name: 'Nok Member',
    email: 'member@pm.local',
    role: 'member',
    departmentId: null,
    departmentName: null,
    createdAt: new Date('2026-07-16T02:00:00.000Z'),
  },
]

const departmentsFixture = [{ id: 14, name: 'Engineering', memberCount: 2 }]

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <UsersPage />
      <Toaster />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(listUsers).mockResolvedValue(usersFixture as never)
  vi.mocked(listDepartments).mockResolvedValue(departmentsFixture)
  vi.mocked(createUser).mockReset()
  vi.mocked(createDepartment).mockReset()
  sessionRef.current = { user: { id: 'u1', name: 'Somchai Admin', role: 'admin' } }
})

describe('UsersPage', () => {
  it('admin เห็นตารางผู้ใช้และแผนก', async () => {
    renderPage()

    expect(await screen.findByText('Somchai Admin')).toBeInTheDocument()
    expect(screen.getByText('member@pm.local')).toBeInTheDocument()
    // 'Engineering' แสดงทั้งใน select ของตารางและการ์ด Departments
    expect((await screen.findAllByText('Engineering')).length).toBeGreaterThan(1)
    expect(screen.getByText('2 members')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /New user/ }),
    ).toBeInTheDocument()
  })

  it('member เห็นหน้า Forbidden', () => {
    sessionRef.current = { user: { id: 'u2', name: 'Nok', role: 'member' } }
    renderPage()
    expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /New user/ })).not.toBeInTheDocument()
  })

  it('สร้างผู้ใช้ผ่าน drawer → createUser ถูกเรียก', async () => {
    const user = userEvent.setup()
    vi.mocked(createUser).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('Somchai Admin')

    await user.click(screen.getByRole('button', { name: /New user/ }))
    expect(await screen.findByText(/สร้างบัญชีผู้ใช้ใหม่/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'New Member')
    await user.type(screen.getByLabelText('Email'), 'new@pm.local')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(createUser).toHaveBeenCalled())
    expect(vi.mocked(createUser).mock.calls[0]![0]).toMatchObject({
      data: {
        name: 'New Member',
        email: 'new@pm.local',
        role: 'member',
        departmentId: null,
      },
    })
    expect(await screen.findByText('สร้างผู้ใช้แล้ว')).toBeInTheDocument()
  })

  it('สร้างผู้ใช้ fail → toast.error + inline', async () => {
    const user = userEvent.setup()
    vi.mocked(createUser).mockRejectedValue(new Error('อีเมลซ้ำ'))
    renderPage()
    await screen.findByText('Somchai Admin')

    await user.click(screen.getByRole('button', { name: /New user/ }))
    await screen.findByText(/สร้างบัญชีผู้ใช้ใหม่/)
    await user.type(screen.getByLabelText('Name'), 'New Member')
    await user.type(screen.getByLabelText('Email'), 'new@pm.local')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('สร้างผู้ใช้ไม่สำเร็จ')).toBeInTheDocument()
    expect(await screen.findAllByText('อีเมลซ้ำ').then((els) => els.length)).toBeGreaterThan(0)
  })

  it('เพิ่มแผนกผ่านฟอร์มล่าง → createDepartment ถูกเรียก', async () => {
    const user = userEvent.setup()
    vi.mocked(createDepartment).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('Somchai Admin')

    await user.type(
      screen.getByPlaceholderText('New department name'),
      'Design',
    )
    await user.click(screen.getByRole('button', { name: /Add/ }))

    await waitFor(() =>
      expect(createDepartment).toHaveBeenCalledWith({ data: { name: 'Design' } }),
    )
    expect(await screen.findByText('เพิ่มแผนกแล้ว')).toBeInTheDocument()
  })

  it('เพิ่มแผนก fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(createDepartment).mockRejectedValue(new Error('ชื่อซ้ำ'))
    renderPage()
    await screen.findByText('Somchai Admin')

    await user.type(screen.getByPlaceholderText('New department name'), 'X')
    await user.click(screen.getByRole('button', { name: /Add/ }))

    expect(await screen.findByText('เพิ่มแผนกไม่สำเร็จ')).toBeInTheDocument()
  })

  it('กด Cancel ใน drawer → ปิดไม่เรียก createUser', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Somchai Admin')

    await user.click(screen.getByRole('button', { name: /New user/ }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(
        screen.queryByText(/สร้างบัญชีผู้ใช้ใหม่/),
      ).not.toBeInTheDocument(),
    )
    expect(createUser).not.toHaveBeenCalled()
  })

  it('เลือกแผนกใน drawer → createUser ได้ departmentId', async () => {
    const user = userEvent.setup()
    vi.mocked(createUser).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('Somchai Admin')

    await user.click(screen.getByRole('button', { name: /New user/ }))
    await screen.findByText(/สร้างบัญชีผู้ใช้ใหม่/)

    await user.click(screen.getByLabelText('Department'))
    await user.click(await screen.findByRole('option', { name: 'Engineering' }))

    await user.type(screen.getByLabelText('Name'), 'New Member')
    await user.type(screen.getByLabelText('Email'), 'new@pm.local')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(createUser).toHaveBeenCalled())
    expect(vi.mocked(createUser).mock.calls[0]![0]).toMatchObject({
      data: { departmentId: 14 },
    })
  })

  it('ตารางกำลังโหลด → แสดง skeleton row ไม่มีข้อมูลผู้ใช้', async () => {
    vi.mocked(listUsers).mockReturnValue(new Promise(() => {}) as never)
    renderPage()

    // ส่วนหัว render ทันที
    expect(
      await screen.findByRole('heading', { name: 'Users' }),
    ).toBeInTheDocument()
    // ตารางยังโหลด → skeleton + ไม่มีแถวผู้ใช้
    expect(document.querySelector('.animate-pulse')).not.toBeNull()
    expect(screen.queryByText('admin@pm.local')).not.toBeInTheDocument()
  })

  it('เปลี่ยน role ในตาราง → updateUser ถูกเรียก + toast', async () => {
    const user = userEvent.setup()
    vi.mocked(updateUser).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('Somchai Admin')

    const row = screen.getByRole('row', { name: /Somchai Admin/ })
    await user.click(within(row).getAllByRole("combobox")[0]!)
    await user.click(await screen.findByRole('option', { name: 'manager' }))

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({
        data: { id: 'u1', role: 'manager' },
      }),
    )
    expect(await screen.findByText('อัปเดตข้อมูลผู้ใช้แล้ว')).toBeInTheDocument()
  })

  it('เปลี่ยนแผนกเป็น "—" → departmentId เป็น null', async () => {
    const user = userEvent.setup()
    vi.mocked(updateUser).mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('Somchai Admin')

    const row = screen.getByRole('row', { name: /Somchai Admin/ })
    await user.click(within(row).getAllByRole("combobox")[1]!)
    await user.click(await screen.findByRole('option', { name: '—' }))

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({
        data: { id: 'u1', departmentId: null },
      }),
    )
  })

  it('อัปเดตผู้ใช้ fail → toast.error', async () => {
    const user = userEvent.setup()
    vi.mocked(updateUser).mockRejectedValue(new Error('ห้ามแก้'))
    renderPage()
    await screen.findByText('Somchai Admin')

    const row = screen.getByRole('row', { name: /Somchai Admin/ })
    await user.click(within(row).getAllByRole("combobox")[0]!)
    await user.click(await screen.findByRole('option', { name: 'manager' }))

    expect(await screen.findByText('อัปเดตผู้ใช้ไม่สำเร็จ')).toBeInTheDocument()
  })
})
