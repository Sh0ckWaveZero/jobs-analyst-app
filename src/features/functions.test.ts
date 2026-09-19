import { describe, expect, it } from 'vitest'

// *.functions.ts เป็น server-fn wrapper บาง ๆ — ตรวจว่าทุกตัวสร้างได้และเรียกได้
// (ครอบโค้ดจริงของไฟล์ ซึ่งเป็นการ declare createServerFn ทั้งหมด)
import { getSession } from './auth/auth.functions'
import {
  createIssue,
  deleteIssue,
  listIssues,
  updateIssue,
  getDashboardCounts,
} from './issues/issues.functions'
import {
  createProject,
  getArchivedProjects,
  getProjects,
  updateProject,
} from './projects/projects.functions'
import {
  addManualEntry,
  deleteEntry,
  getMyWeekMinutes,
  listMyEntries,
  getRunningEntry,
  getWorkHourAnalysis,
  listIssueEntries,
  startTimer,
  stopTimer,
  updateEntry,
} from './time-entries/time-entries.functions'
import {
  createDepartment,
  createUser,
  getAssignableUsers,
  listDepartments,
  listUsers,
  updateUser,
} from './users/users.functions'

describe('server function wrappers', () => {
  it('auth functions', () => {
    expect(typeof getSession).toBe('function')
  })

  it('issue functions', () => {
    ;[createIssue, deleteIssue, listIssues, updateIssue, getDashboardCounts].forEach(
      (fn) => expect(typeof fn).toBe('function'),
    )
  })

  it('project functions', () => {
    ;[createProject, getArchivedProjects, getProjects, updateProject].forEach(
      (fn) => expect(typeof fn).toBe('function'),
    )
  })

  it('time-entry functions', () => {
    ;[
      addManualEntry,
      deleteEntry,
      getMyWeekMinutes,
      listMyEntries,
      listIssueEntries,
      updateEntry,
      getRunningEntry,
      getWorkHourAnalysis,
      startTimer,
      stopTimer,
    ].forEach((fn) => expect(typeof fn).toBe('function'))
  })

  it('user functions', () => {
    ;[
      createDepartment,
      createUser,
      getAssignableUsers,
      listDepartments,
      listUsers,
      updateUser,
    ].forEach((fn) => expect(typeof fn).toBe('function'))
  })
})
