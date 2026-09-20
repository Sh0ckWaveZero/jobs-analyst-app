import { Role } from './roles'
import type { UserRole } from './roles'

/** สิทธิ์ที่ระบบรองรับ — เก็บเป็น catalog เดียวสำหรับ UI, server guard และ seed */
export const Permissions = {
  UsersManage: 'users.manage',
  DepartmentsManage: 'departments.manage',
  RolesManage: 'roles.manage',
  ProjectsManage: 'projects.manage',
  IssuesCreate: 'issues.create',
  IssuesManageAll: 'issues.manage_all',
  IssuesManageOwned: 'issues.manage_owned',
  IssuesManageAssigned: 'issues.manage_assigned',
  IssuesAssignAny: 'issues.assign_any',
  IssuesAssignDepartment: 'issues.assign_department',
  TimeEntriesCreate: 'time_entries.create',
  TimeEntriesManageAll: 'time_entries.manage_all',
  ReportsViewAll: 'reports.view_all',
  ReportsViewTeam: 'reports.view_team',
  ReportsViewOwn: 'reports.view_own',
} as const

export const PERMISSION_KEYS = [
  Permissions.UsersManage,
  Permissions.DepartmentsManage,
  Permissions.RolesManage,
  Permissions.ProjectsManage,
  Permissions.IssuesCreate,
  Permissions.IssuesManageAll,
  Permissions.IssuesManageOwned,
  Permissions.IssuesManageAssigned,
  Permissions.IssuesAssignAny,
  Permissions.IssuesAssignDepartment,
  Permissions.TimeEntriesCreate,
  Permissions.TimeEntriesManageAll,
  Permissions.ReportsViewAll,
  Permissions.ReportsViewTeam,
  Permissions.ReportsViewOwn,
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export type PermissionDefinition = {
  key: PermissionKey
  group: 'Workspace' | 'Projects' | 'Issues' | 'Time tracking' | 'Reports'
  label: string
  description: string
  /** สิทธิ์ดูแล access control ของ Admin เอง ห้ามปิดเพื่อกันระบบล็อกตัวเอง */
  protectedForAdmin?: boolean
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [Role.Admin]: 'Admin',
  [Role.Manager]: 'Manager',
  [Role.Member]: 'Member',
}

export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  {
    key: Permissions.UsersManage,
    group: 'Workspace',
    label: 'Manage users',
    description: 'Create, update, assign roles and deactivate workspace users.',
    protectedForAdmin: true,
  },
  {
    key: Permissions.DepartmentsManage,
    group: 'Workspace',
    label: 'Manage departments',
    description: 'Create, rename and remove departments used for team scope.',
    protectedForAdmin: true,
  },
  {
    key: Permissions.RolesManage,
    group: 'Workspace',
    label: 'Manage roles & permissions',
    description: 'Change the permission matrix and role assignments.',
    protectedForAdmin: true,
  },
  {
    key: Permissions.ProjectsManage,
    group: 'Projects',
    label: 'Manage projects',
    description: 'Create projects and update projects within the role scope.',
  },
  {
    key: Permissions.IssuesCreate,
    group: 'Issues',
    label: 'Create issues',
    description: 'Create new issues in active projects.',
  },
  {
    key: Permissions.IssuesManageAll,
    group: 'Issues',
    label: 'Manage all issues',
    description: 'Update or delete any issue regardless of ownership.',
  },
  {
    key: Permissions.IssuesManageOwned,
    group: 'Issues',
    label: 'Manage owned-project issues',
    description: 'Update or delete issues in projects owned by the user.',
  },
  {
    key: Permissions.IssuesManageAssigned,
    group: 'Issues',
    label: 'Manage assigned issues',
    description: 'Update or delete issues reported or assigned to the user.',
  },
  {
    key: Permissions.IssuesAssignAny,
    group: 'Issues',
    label: 'Assign to anyone',
    description: 'Assign issues to any workspace user.',
  },
  {
    key: Permissions.IssuesAssignDepartment,
    group: 'Issues',
    label: 'Assign within department',
    description: 'Assign issues to yourself or a colleague in your department.',
  },
  {
    key: Permissions.TimeEntriesCreate,
    group: 'Time tracking',
    label: 'Log time',
    description: 'Start a timer or add a manual time entry.',
  },
  {
    key: Permissions.TimeEntriesManageAll,
    group: 'Time tracking',
    label: 'Manage all time entries',
    description: 'Edit or remove time entries created by other users.',
  },
  {
    key: Permissions.ReportsViewAll,
    group: 'Reports',
    label: 'View all reports',
    description: 'See work-hour reports across every project and user.',
  },
  {
    key: Permissions.ReportsViewTeam,
    group: 'Reports',
    label: 'View team reports',
    description: 'See reports for owned projects and the user’s own work.',
  },
  {
    key: Permissions.ReportsViewOwn,
    group: 'Reports',
    label: 'View own reports',
    description: 'See work-hour reports for the current user only.',
  },
]

/** ค่าเริ่มต้นของ built-in roles ก่อนมี override ในฐานข้อมูล */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  UserRole,
  readonly PermissionKey[]
> = {
  [Role.Admin]: PERMISSION_KEYS,
  [Role.Manager]: [
    Permissions.ProjectsManage,
    Permissions.IssuesCreate,
    Permissions.IssuesManageOwned,
    Permissions.IssuesAssignAny,
    Permissions.TimeEntriesCreate,
    Permissions.ReportsViewTeam,
    Permissions.ReportsViewOwn,
  ],
  [Role.Member]: [
    Permissions.IssuesCreate,
    Permissions.IssuesManageAssigned,
    Permissions.IssuesAssignDepartment,
    Permissions.TimeEntriesCreate,
    Permissions.ReportsViewOwn,
  ],
}

export function defaultHasPermission(
  role: string | null | undefined,
  permission: PermissionKey,
) {
  if (!role || !Object.hasOwn(DEFAULT_ROLE_PERMISSIONS, role)) return false
  return DEFAULT_ROLE_PERMISSIONS[role as UserRole].includes(permission)
}
