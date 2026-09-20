import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'

import { AccessManagementPage } from './access-management-page'
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  listUsers,
  updateDepartment,
  updateUser,
} from '@/features/users/users.functions'
import {
  createRole,
  createPermission,
  deleteRole,
  listRoles,
  listRbacMatrix,
  updateRole,
  updateRolePermissions,
} from '@/features/settings/rbac.functions'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode
    to: string
    [key: string]: unknown
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))

const sessionRef = vi.hoisted(() => ({
  current: {
    user: { id: 'u1', name: 'Somchai Admin', role: 'admin' },
  },
}))

vi.mock('@/features/auth/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: sessionRef.current, isPending: false }),
  },
}))

vi.mock('@/features/users/users.functions', () => ({
  createDepartment: vi.fn(),
  deleteDepartment: vi.fn(),
  listDepartments: vi.fn(),
  listUsers: vi.fn(),
  updateDepartment: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('@/features/settings/rbac.functions', () => ({
  createRole: vi.fn(),
  createPermission: vi.fn(),
  deleteRole: vi.fn(),
  listRoles: vi.fn(),
  listRbacMatrix: vi.fn(),
  updateRole: vi.fn(),
  updateRolePermissions: vi.fn(),
}))

function renderPage(section: 'departments' | 'roles' = 'departments') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AccessManagementPage section={section} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(listDepartments).mockResolvedValue([
    { id: 14, name: 'Engineering', memberCount: 2 },
    { id: 2, name: 'Marketing', memberCount: 1 },
  ] as never)
  vi.mocked(listUsers).mockResolvedValue([
    {
      id: 'u1',
      name: 'Somchai Admin',
      email: 'admin@pm.local',
      role: 'admin',
      departmentName: 'Engineering',
    },
    {
      id: 'u2',
      name: 'Nok Member',
      email: 'nok@pm.local',
      role: 'member',
      departmentName: 'Marketing',
    },
  ] as never)
  vi.mocked(createDepartment).mockResolvedValue({
    id: 20,
    name: 'Design',
  } as never)
  vi.mocked(updateDepartment).mockResolvedValue({
    id: 14,
    name: 'Platform',
  })
  vi.mocked(deleteDepartment).mockResolvedValue({ ok: true } as never)
  vi.mocked(updateUser).mockResolvedValue({ ok: true } as never)
  const roles = [
    {
      key: 'admin',
      label: 'Admin',
      description: 'Full workspace access',
      isSystem: true,
      memberCount: 1,
    },
    {
      key: 'manager',
      label: 'Manager',
      description: 'Team operations',
      isSystem: true,
      memberCount: 0,
    },
    {
      key: 'member',
      label: 'Member',
      description: 'Individual contributor',
      isSystem: true,
      memberCount: 1,
    },
  ]
  vi.mocked(listRoles).mockResolvedValue(roles)
  vi.mocked(createRole).mockResolvedValue({
    key: 'custom_project_lead_1234abcd',
    label: 'Project lead',
    description: 'Owns project delivery',
    isSystem: false,
    memberCount: 0,
  } as never)
  vi.mocked(createPermission).mockResolvedValue({
    key: 'invoices.view',
    permissionGroup: 'Billing',
    label: 'View invoices',
    description: 'View invoices.',
    isSystem: false,
    protectedForAdmin: false,
  } as never)
  vi.mocked(updateRole).mockResolvedValue({ ok: true } as never)
  vi.mocked(deleteRole).mockResolvedValue({ ok: true } as never)
  vi.mocked(listRbacMatrix).mockResolvedValue({
    roles,
    permissions: [
      {
        key: 'users.manage',
        group: 'Workspace',
        label: 'Manage users',
        description: 'Manage workspace users.',
        isSystem: true,
        protectedForAdmin: true,
        enabled: { admin: true, manager: false, member: false },
      },
      {
        key: 'issues.create',
        group: 'Issues',
        label: 'Create issues',
        description: 'Create issues.',
        isSystem: true,
        protectedForAdmin: false,
        enabled: { admin: true, manager: true, member: true },
      },
    ],
  })
  vi.mocked(updateRolePermissions).mockResolvedValue({
    ok: true,
    updated: 1,
  } as never)
})

describe('AccessManagementPage', () => {
  it('แสดงรายการแผนกและเพิ่มแผนกผ่าน React Hook Form', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add department' }))
    await user.type(screen.getByLabelText('Department name'), 'Design')
    await user.click(screen.getByRole('button', { name: 'Save department' }))

    await waitFor(() =>
      expect(createDepartment).toHaveBeenCalledWith({
        data: { name: 'Design' },
      }),
    )
  })

  it('แสดงแท็บ access management พร้อมสถานะที่เลือก', async () => {
    const user = userEvent.setup()
    renderPage()

    const departmentsTab = await screen.findByRole('tab', {
      name: 'Departments',
    })
    const rbacTab = screen.getByRole('tab', {
      name: 'Roles & permissions',
    })

    expect(departmentsTab).toHaveAttribute('aria-selected', 'true')
    expect(rbacTab).toHaveAttribute('aria-selected', 'false')

    await user.click(rbacTab)
    expect(departmentsTab).toHaveAttribute('aria-selected', 'false')
    expect(rbacTab).toHaveAttribute('aria-selected', 'true')
  })

  it('แก้ชื่อแผนกผ่าน dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Edit Engineering' }),
    )
    const input = screen.getByLabelText('Department name')
    await user.clear(input)
    await user.type(input, 'Platform')
    await user.click(screen.getByRole('button', { name: 'Save department' }))

    await waitFor(() =>
      expect(updateDepartment).toHaveBeenCalledWith({
        data: { id: 14, name: 'Platform' },
      }),
    )
  })

  it('แสดง RBAC matrix และเปลี่ยน role ของสมาชิก', async () => {
    const user = userEvent.setup()
    renderPage('roles')

    expect(
      await screen.findByText('RBAC permission matrix'),
    ).toBeInTheDocument()
    expect(listRbacMatrix).toHaveBeenCalled()
    expect(await screen.findByText('Manage users')).toBeInTheDocument()
    expect(screen.getAllByText('Full workspace access').length).toBeGreaterThan(
      0,
    )
    expect(screen.getByText('Role assignments')).toBeInTheDocument()

    const issuePermission = screen.getByRole('checkbox', {
      name: 'Create issues for Member',
    })
    await user.click(issuePermission)
    expect(issuePermission).toHaveAttribute('aria-checked', 'false')
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).not.toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(updateRolePermissions).toHaveBeenCalledWith({
        data: {
          updates: [
            { role: 'member', permission: 'issues.create', enabled: false },
          ],
        },
      }),
    )

    await screen.findByText('Nok Member')
    const row = screen.getByRole('row', { name: /Nok Member/ })
    const roleSelect = row.querySelector('[role="combobox"]')
    if (!roleSelect) throw new Error('role select not found')
    await user.click(roleSelect)
    await user.click(await screen.findByRole('option', { name: /Admin/ }))

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({
        data: { id: 'u2', role: 'admin' },
      }),
    )
  })

  it('สร้าง custom role ผ่าน React Hook Form', async () => {
    const user = userEvent.setup()
    renderPage('roles')

    await user.click(await screen.findByRole('button', { name: 'Add role' }))
    await user.type(screen.getByLabelText('Role name'), 'Project lead')
    await user.type(
      screen.getByLabelText('Description'),
      'Owns project delivery',
    )
    await user.click(screen.getByRole('button', { name: 'Save role' }))

    await waitFor(() =>
      expect(createRole).toHaveBeenCalledWith({
        data: {
          label: 'Project lead',
          description: 'Owns project delivery',
        },
      }),
    )
  })

  it('เพิ่ม permission ใหม่เข้า matrix ผ่าน React Hook Form', async () => {
    const user = userEvent.setup()
    renderPage('roles')

    await user.click(
      await screen.findByRole('button', { name: 'Add permission' }),
    )
    await user.type(screen.getByLabelText('Permission key'), 'invoices.view')
    await user.clear(screen.getByLabelText('Group'))
    await user.type(screen.getByLabelText('Group'), 'Billing')
    await user.type(screen.getByLabelText('Permission name'), 'View invoices')
    await user.type(screen.getByLabelText('Description'), 'View invoices.')
    await user.click(screen.getByRole('button', { name: 'Save permission' }))

    await waitFor(() =>
      expect(createPermission).toHaveBeenCalledWith({
        data: {
          key: 'invoices.view',
          group: 'Billing',
          label: 'View invoices',
          description: 'View invoices.',
        },
      }),
    )
  })
})
