import {
  ISSUE_STATUSES,
  PROJECT_STATUSES,
  type IssueStatus,
  type ProjectStatus,
} from '@876/projects/contracts'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

/**
 * The status filter vocabulary, shared by every host that lists projects or
 * issues. It lives here rather than in each app so Console and the standalone
 * app cannot drift into offering different filters over the same data.
 */
export type ProjectFilterStatus = ProjectStatus | 'all'
export type IssueFilterStatus = IssueStatus | 'all'

export const PROJECT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All projects', headingLabel: 'All Projects' },
  { value: 'planned', label: 'Planned', headingLabel: 'Planned Projects' },
  { value: 'active', label: 'Active', headingLabel: 'Active Projects' },
  { value: 'paused', label: 'Paused', headingLabel: 'Paused Projects' },
  {
    value: 'completed',
    label: 'Completed',
    headingLabel: 'Completed Projects',
  },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Projects' },
]

export const ISSUE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All issues', headingLabel: 'All Issues' },
  { value: 'backlog', label: 'Backlog', headingLabel: 'Backlog Issues' },
  { value: 'todo', label: 'Todo', headingLabel: 'Todo Issues' },
  {
    value: 'in-progress',
    label: 'In Progress',
    headingLabel: 'In Progress Issues',
  },
  { value: 'in-review', label: 'In Review', headingLabel: 'In Review Issues' },
  { value: 'done', label: 'Done', headingLabel: 'Done Issues' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Issues' },
]

export function isProjectStatus(
  status: string | undefined
): status is ProjectStatus {
  if (!status) return false
  return (PROJECT_STATUSES as readonly string[]).includes(status)
}

export function isIssueStatus(
  status: string | undefined
): status is IssueStatus {
  if (!status) return false
  return (ISSUE_STATUSES as readonly string[]).includes(status)
}
