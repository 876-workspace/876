import { ISSUE_STATUSES, type Issue } from '@876/projects/contracts'

import { formatIssuePriority } from './priority-badges'
import { formatIssueStatus } from './status-badges'

export type IssueGrouping =
  | 'status'
  | 'project'
  | 'priority'
  | 'assignee'
  | 'type'
  | 'milestone'

export type IssueGroup = {
  key: string
  label: string
  issues: Issue[]
  order: number
}

const PRIORITY_ORDER = new Map([
  ['urgent', 0],
  ['high', 1],
  ['medium', 2],
  ['low', 3],
  ['none', 4],
])

function groupKey(issue: Issue, groupBy: IssueGrouping): string {
  switch (groupBy) {
    case 'project':
      return issue.projectId
    case 'priority':
      return issue.priority
    case 'assignee':
      return issue.assigneeUserId ?? 'unassigned'
    case 'type':
      return issue.type?.id ?? issue.typeKey
    case 'milestone':
      return issue.milestone?.id ?? 'no-milestone'
    case 'status':
    default:
      return issue.status
  }
}

function groupLabel(
  issue: Issue,
  groupBy: IssueGrouping,
  userLabels: Readonly<Record<string, string>>
): string {
  switch (groupBy) {
    case 'project':
      return issue.projectKey
    case 'priority':
      return formatIssuePriority(issue.priority)
    case 'assignee':
      return issue.assigneeUserId
        ? userLabels[issue.assigneeUserId] ?? issue.assigneeUserId
        : 'Unassigned'
    case 'type':
      return issue.type?.name ?? issue.typeKey
    case 'milestone':
      return issue.milestone?.name ?? 'No phase'
    case 'status':
    default:
      return issue.state?.name ?? formatIssueStatus(issue.status)
  }
}

function groupOrder(issue: Issue, groupBy: IssueGrouping): number {
  switch (groupBy) {
    case 'priority':
      return PRIORITY_ORDER.get(issue.priority) ?? Number.MAX_SAFE_INTEGER
    case 'status': {
      const legacyIndex = ISSUE_STATUSES.indexOf(
        issue.status as (typeof ISSUE_STATUSES)[number]
      )
      if (legacyIndex >= 0) return legacyIndex
      return ISSUE_STATUSES.length + (issue.state?.position ?? 1000)
    }
    default:
      return Number.MAX_SAFE_INTEGER
  }
}

export function createIssueGroups(
  issues: readonly Issue[],
  groupBy: IssueGrouping,
  userLabels: Readonly<Record<string, string>> = {},
  includeLegacyStatusGroups = false
): IssueGroup[] {
  const groups = new Map<string, IssueGroup>()

  if (groupBy === 'status' && includeLegacyStatusGroups) {
    ISSUE_STATUSES.forEach((status, order) => {
      groups.set(status, {
        key: status,
        label: formatIssueStatus(status),
        issues: [],
        order,
      })
    })
  }

  for (const issue of issues) {
    const key = groupKey(issue, groupBy)
    const existing = groups.get(key)
    if (existing) {
      existing.issues.push(issue)
      if (groupBy === 'status' && issue.state?.name)
        existing.label = issue.state.name
      continue
    }

    groups.set(key, {
      key,
      label: groupLabel(issue, groupBy, userLabels),
      issues: [issue],
      order: groupOrder(issue, groupBy),
    })
  }

  return [...groups.values()].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order
    return left.label.localeCompare(right.label)
  })
}
