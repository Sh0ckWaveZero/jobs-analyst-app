import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'

import { SettingsBreadcrumb, SettingsNav, SettingsPage } from './settings-page'
import { authClient } from '@/features/auth/auth-client'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    ...rest
  }: {
    children: React.ReactNode
    to: string
    search?: Record<string, string>
    [key: string]: unknown
  }) => {
    const query = search ? `?${new URLSearchParams(search).toString()}` : ''
    return (
      <a href={`${to}${query}`} {...rest}>
        {children}
      </a>
    )
  },
  useLocation: () => ({ pathname: '/settings' }),
}))

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
  authClient: {
    useSession: () => ({ data: sessionRef.current }),
    updateUser: vi.fn(async () => ({ data: {}, error: null })),
    changePassword: vi.fn(async () => ({ data: {}, error: null })),
  },
}))
vi.mock('@/features/users/users.functions', () => ({
  listDepartments: vi.fn(async () => [
    { id: 14, name: 'Engineering' },
    { id: 2, name: 'Marketing' },
  ]),
}))

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('SettingsProfilePage', () => {
  it('แสดงโปรไฟล์ บทบาท แผนก และวันเข้าร่วม', async () => {
    renderPage(<SettingsPage section="profile" />)

    expect(await screen.findByText('Somchai Admin')).toBeInTheDocument()
    expect(screen.getByText('admin@pm.local')).toBeInTheDocument()
    // badge ใช้ CSS uppercase — ข้อความใน DOM ยังเป็นตัวเล็ก
    expect(screen.getByText('admin', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Admin — จัดการได้ทุกอย่าง')).toBeInTheDocument()
    expect(await screen.findByText('แผนก: Engineering')).toBeInTheDocument()
    expect(screen.getByText(/เข้าร่วมเมื่อ/)).toBeInTheDocument()
    expect(screen.getAllByText('โปรไฟล์').length).toBeGreaterThan(0)
  })

  it('ไม่มี session → แสดงข้อความไม่พบ', () => {
    const previous = sessionRef.current
    sessionRef.current = undefined as unknown as typeof previous
    renderPage(<SettingsPage section="profile" />)
    expect(screen.getByText('ไม่พบ session')).toBeInTheDocument()
    sessionRef.current = previous
  })

  it('ไม่สังกัดแผนกเมื่อ departmentId เป็น null', async () => {
    const previous = sessionRef.current
    sessionRef.current = {
      ...previous,
      user: { ...previous.user, departmentId: null },
    }
    renderPage(<SettingsPage section="profile" />)
    expect(await screen.findByText('แผนก: ไม่สังกัดแผนก')).toBeInTheDocument()
    sessionRef.current = previous
  })

  it('แก้ไขชื่อ → authClient.updateUser ถูกเรียกด้วยชื่อใหม่', async () => {
    const user = userEvent.setup()
    renderPage(<SettingsPage section="profile" />)
    expect(await screen.findByText('Somchai Admin')).toBeInTheDocument()

    const nameInput = screen.getByLabelText('ชื่อที่แสดง')
    await user.clear(nameInput)
    await user.type(nameInput, 'Somchai ใหม่')
    await user.click(screen.getByRole('button', { name: 'บันทึกชื่อ' }))

    await waitFor(() =>
      expect(authClient.updateUser).toHaveBeenCalledWith({
        name: 'Somchai ใหม่',
      }),
    )
  })
})

describe('SettingsSecurityPage', () => {
  it('เปลี่ยนรหัสผ่านสำเร็จ → changePassword ได้ค่าครบ + revokeOtherSessions', async () => {
    const user = userEvent.setup()
    renderPage(<SettingsPage section="security" />)
    expect(await screen.findByText('รหัสผ่านปัจจุบัน')).toBeInTheDocument()

    await user.type(screen.getByLabelText('รหัสผ่านปัจจุบัน'), 'password123')
    await user.type(screen.getByLabelText('รหัสผ่านใหม่'), 'newpassword456')
    await user.type(
      screen.getByLabelText('ยืนยันรหัสผ่านใหม่'),
      'newpassword456',
    )
    await user.click(screen.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }))

    await waitFor(() =>
      expect(authClient.changePassword).toHaveBeenCalledWith({
        currentPassword: 'password123',
        newPassword: 'newpassword456',
        revokeOtherSessions: true,
      }),
    )
  })

  it('ยืนยันรหัสผ่านไม่ตรง → error ในฟอร์ม ไม่เรียก changePassword', async () => {
    const user = userEvent.setup()
    renderPage(<SettingsPage section="security" />)

    await user.type(screen.getByLabelText('รหัสผ่านปัจจุบัน'), 'password123')
    await user.type(screen.getByLabelText('รหัสผ่านใหม่'), 'newpassword456')
    await user.type(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), 'different789')
    await user.click(screen.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }))

    await waitFor(() =>
      expect(screen.getByLabelText('ยืนยันรหัสผ่านใหม่')).toHaveClass(
        'is-shaking',
      ),
    )
    expect(await screen.findByText('รหัสผ่านใหม่ไม่ตรงกัน')).toBeInTheDocument()
    expect(authClient.changePassword).not.toHaveBeenCalled()
  })
})

describe('SettingsNotificationsPage', () => {
  it('แสดง placeholder การแจ้งเตือน', async () => {
    renderPage(<SettingsPage section="notifications" />)
    expect(
      await screen.findByText(
        'ยังไม่มีการแจ้งเตือน — จะแจ้งเมื่อมีการมอบหมาย issue ให้คุณ',
      ),
    ).toBeInTheDocument()
  })
})

describe('SettingsNav', () => {
  it('admin เห็น Access management เป็น section ระดับเดียวกับ settings อื่น', () => {
    renderPage(<SettingsNav section="access" isAdmin />)

    expect(
      screen.getByRole('link', { name: 'Access management' }),
    ).toBeInTheDocument()
  })

  it('member ไม่เห็น Access management', () => {
    renderPage(<SettingsNav section="profile" />)

    expect(screen.queryByText('Access management')).not.toBeInTheDocument()
  })

  it('แสดง icons และ mark section ปัจจุบัน active', () => {
    renderPage(<SettingsNav section="security" />)

    const securityLink = screen.getByRole('link', { name: 'ความปลอดภัย' })
    expect(securityLink).toHaveAttribute('aria-current', 'page')
    expect(securityLink).toHaveClass('bg-muted')
    expect(securityLink.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'โปรไฟล์' })).not.toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

describe('SettingsBreadcrumb', () => {
  it('ลิงก์กลับ Settings และ section ปัจจุบันได้', () => {
    renderPage(<SettingsBreadcrumb current="โปรไฟล์" tab="profile" />)

    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings?tab=profile&section=departments',
    )
    expect(screen.getByRole('link', { name: 'โปรไฟล์' })).toHaveAttribute(
      'href',
      '/settings?tab=profile&section=departments',
    )
  })
})
