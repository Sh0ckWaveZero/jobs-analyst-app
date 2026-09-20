import type { AnalysisRange } from '@/features/time-entries/time-entries.schema'

/**
 * Central queryKey registry — route loaders และ components ต้องอ้าง key จากที่นี่เท่านั้น
 * เพื่อกัน key หลุด sync ระหว่าง prefetch (loader) กับ query ที่ component ใช้
 */
export const queryKeys = {
  root: ['pm'] as const,
  dashboardCounts: ['pm', 'counts'] as const,
  myWeekMinutes: ['pm', 'week'] as const,
  workHourAnalysis: (range: AnalysisRange) =>
    ['pm', 'analysis', range] as const,
  runningEntry: ['pm', 'running'] as const,
  projects: ['pm', 'projects'] as const,
  projectsArchived: ['pm', 'projects-archived'] as const,
  projectIssues: (projectId: number | string) =>
    ['pm', 'project-issues', projectId] as const,
  commandMenuIssues: ['pm', 'command-menu-issues'] as const,
  assignableUsers: ['pm', 'assignable'] as const,
  myIssues: ['pm', 'issues', 'mine'] as const,
  myEntries: ['pm', 'my-entries'] as const,
  myEntriesPage: (page: number) => ['pm', 'my-entries-all', page] as const,
  myEntriesCount: ['pm', 'my-entries-count'] as const,
  issueEntries: (issueId: number) => ['pm', 'issue-entries', issueId] as const,
  issueEntriesPage: (issueId: number, page: number, userId?: string) =>
    userId
      ? (['pm', 'issue-entries', issueId, page, userId] as const)
      : (['pm', 'issue-entries', issueId, page] as const),
  issueEntriesCount: (issueId: number, userId?: string) =>
    userId
      ? (['pm', 'issue-entries-count', issueId, userId] as const)
      : (['pm', 'issue-entries-count', issueId] as const),
  issueMeta: (issueId: number) => ['pm', 'issue-meta', issueId] as const,
  report: (range: AnalysisRange) => ['pm', 'report', range] as const,
  users: ['pm', 'users'] as const,
  departments: ['pm', 'departments'] as const,
  roles: ['pm', 'roles'] as const,
  rbac: ['pm', 'rbac'] as const,
}
