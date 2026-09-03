import type { StatusFilterOption } from '@876/ui/status-filter-heading'
import { ISSUE_STATUSES, type IssueStatus } from '@876/projects/contracts'

export type IssueFilterStatus = IssueStatus | 'all'

export const ISSUE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All issues', headingLabel: 'All Issues' },
  { value: 'backlog', label: 'Backlog', headingLabel: 'Backlog Issues' },
  { value: 'todo', label: 'Todo', headingLabel: 'Todo Issues' },
  { value: 'in-progress', label: 'In Progress', headingLabel: 'In Progress Issues' },
  { value: 'in-review', label: 'In Review', headingLabel: 'In Review Issues' },
  { value: 'done', label: 'Done', headingLabel: 'Done Issues' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Issues' },
]

export function isIssueStatus(
  status: string | undefined
): status is IssueStatus {
  if (!status) return false
  return (ISSUE_STATUSES as readonly string[]).includes(status)
}
