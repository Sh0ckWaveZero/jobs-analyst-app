import { createServerFn } from '@tanstack/react-start'

import {
  createProjectRecord,
  getArchivedProjectsRecord,
  getProjectsRecord,
  updateProjectRecord,
} from './projects.server'
import {
  createProjectInputSchema,
  updateProjectInputSchema,
} from './projects.schema'

export const getProjects = createServerFn({ method: 'GET' }).handler(() =>
  getProjectsRecord(),
)

export const createProject = createServerFn({ method: 'POST' })
  .validator(createProjectInputSchema)
  .handler(({ data }) => createProjectRecord(data))

export const updateProject = createServerFn({ method: 'POST' })
  .validator(updateProjectInputSchema)
  .handler(({ data }) => updateProjectRecord(data))

export const getArchivedProjects = createServerFn({ method: 'GET' }).handler(
  () => getArchivedProjectsRecord(),
)
