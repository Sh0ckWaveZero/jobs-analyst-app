import { createServerFn } from '@tanstack/react-start'

import { requireSession } from '@/features/auth/auth.server'
import {
  createDepartmentRecord,
  createUserRecord,
  deleteDepartmentRecord,
  getAssignableUsersRecord,
  listDepartmentsRecord,
  listUsersRecord,
  updateDepartmentRecord,
  updateUserRecord,
} from './users.server'
import {
  createDepartmentInputSchema,
  createUserInputSchema,
  deleteDepartmentInputSchema,
  updateDepartmentInputSchema,
  updateUserInputSchema,
} from './users.schema'

export const listUsers = createServerFn({ method: 'GET' }).handler(() =>
  listUsersRecord(),
)

export const createUser = createServerFn({ method: 'POST' })
  .validator(createUserInputSchema)
  .handler(({ data }) => createUserRecord(data))

export const updateUser = createServerFn({ method: 'POST' })
  .validator(updateUserInputSchema)
  .handler(({ data }) => updateUserRecord(data))

export const listDepartments = createServerFn({ method: 'GET' }).handler(() =>
  listDepartmentsRecord(),
)

export const createDepartment = createServerFn({ method: 'POST' })
  .validator(createDepartmentInputSchema)
  .handler(({ data }) => createDepartmentRecord(data))

export const updateDepartment = createServerFn({ method: 'POST' })
  .validator(updateDepartmentInputSchema)
  .handler(({ data }) => updateDepartmentRecord(data))

export const deleteDepartment = createServerFn({ method: 'POST' })
  .validator(deleteDepartmentInputSchema)
  .handler(({ data }) => deleteDepartmentRecord(data))

export const getAssignableUsers = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requireSession()
    return getAssignableUsersRecord(session)
  },
)
