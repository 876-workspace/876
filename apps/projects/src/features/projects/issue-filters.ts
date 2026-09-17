import {
  ISSUE_ORDERS,
  ISSUE_PRIORITIES,
  type IssueOrder,
  type IssuePriority,
} from '@876/projects/contracts'

import type {
  IssueGroupBy,
  IssueSearchParams,
  ParsedIssueFilters,
} from '@/types/issues'

const GROUPS: readonly IssueGroupBy[] = [
  'none',
  'status',
  'project',
  'priority',
  'assignee',
  'type',
  'milestone',
]

function trimmed(value?: string): string | undefined {
  const result = value?.trim()
  return result ? result : undefined
}

function isPriority(value?: string): value is IssuePriority {
  return Boolean(
    value &&
    ISSUE_PRIORITIES.includes(value as (typeof ISSUE_PRIORITIES)[number])
  )
}

function isOrder(value?: string): value is IssueOrder {
  return Boolean(value && ISSUE_ORDERS.includes(value as IssueOrder))
}

function isGroup(value?: string): value is IssueGroupBy {
  return Boolean(value && GROUPS.includes(value as IssueGroupBy))
}

function isWorkflowStateKey(value?: string): value is string {
  return Boolean(value && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value))
}

export function parseIssueFilters(
  params: IssueSearchParams,
  defaultGroup: IssueGroupBy = 'none'
): ParsedIssueFilters {
  const q = trimmed(params.q)
  const project = trimmed(params.project)
  const assignee = trimmed(params.assignee)
  const label = trimmed(params.label)
  const status = trimmed(params.status)
  const priority = trimmed(params.priority)
  const order = trimmed(params.order)
  const group = trimmed(params.group)

  return {
    query: {
      q,
      project,
      assignee,
      label,
      status: isWorkflowStateKey(status) ? status : undefined,
      priority: isPriority(priority) ? priority : undefined,
      order: isOrder(order) ? order : undefined,
      limit: 100,
    },
    values: {
      q,
      project,
      assignee,
      label,
      status: isWorkflowStateKey(status) ? status : undefined,
      priority: isPriority(priority) ? priority : undefined,
      order: isOrder(order) ? order : undefined,
      group: isGroup(group) ? group : defaultGroup,
    },
    groupBy: isGroup(group) ? group : defaultGroup,
  }
}
