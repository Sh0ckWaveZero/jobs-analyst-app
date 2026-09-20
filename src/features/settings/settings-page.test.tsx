
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

import { SettingsPage } from './settings-page'

type SessionUser = {
  id: string
  name: string
  email: string
  role: string
  departmentId: number | null
  createdAt: string
}

const sessionRef = vi.hoisted<{ current: { user: SessionUser } }>(() => ({
  current: {
    user: {
      id: 'u1',
      name: 'Somchai Admin',
      email: 'admin@pm.local',
      role: 'admin',
      departmentId: 14,
      createdAt: '2026-07-16T02:00:00.000Z',
    },
  },
}))

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@/features/auth/auth-client', () => ({
  authClient: { useSession: () => ({ data: sessionRef.current }) },
}))
vi.mock('@/features/users/users.functions', () => ({
  listDepartments: vi.fn(async () => [
    { id: 14, name: 'Engineering' },
    { id: 2, name: 'Marketing' },
  ]),
}))

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <SettingsPage />
    </QueryClientProvider>,
  )
}

describe('SettingsPage', () => {
  it('แสดงโปรไฟล์ บทบาท แผนก และวันเข้าร่วม', async () => {
    renderPage()

    expect(await screen.findByText('Somchai Admin')).toBeInTheDocument()
    expect(screen.getByText('admin@pm.local')).toBeInTheDocument()
    // badge ใช้ CSS uppercase — ข้อความใน DOM ยังเป็นตัวเล็ก
    expect(screen.getByText('admin', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Admin — จัดการได้ทุกอย่าง')).toBeInTheDocument()
    expect(await screen.findByText('แผนก: Engineering')).toBeInTheDocument()
    expect(screen.getByText(/เข้าร่วมเมื่อ/)).toBeInTheDocument()
  })

  it('ไม่มี session → แสดงข้อความไม่พบ', () => {
    const previous = sessionRef.current
    sessionRef.current = undefined as unknown as typeof previous
    renderPage()
    expect(screen.getByText('ไม่พบ session')).toBeInTheDocument()
    sessionRef.current = previous
  })

  it('ไม่สังกัดแผนกเมื่อ departmentId เป็น null', async () => {
    const previous = sessionRef.current
    sessionRef.current = {
      ...previous,
      user: { ...previous.user, departmentId: null },
    }
    renderPage()
    expect(await screen.findByText('แผนก: ไม่สังกัดแผนก')).toBeInTheDocument()
    sessionRef.current = previous
  })
})
