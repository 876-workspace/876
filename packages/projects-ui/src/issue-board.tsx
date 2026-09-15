'use client'

import Link from 'next/link'
import { ISSUE_STATUSES, type Issue } from '@876/projects/contracts'

import { formatIssuePriority } from './priority-badges'
import { formatIssueStatus, issueStatusTone } from './status-badges'
import { MobileList, MobileListCell, MobileListEmpty } from './mobile-list'

export type IssueBoardGroupBy =
  | 'status'
  | 'project'
  | 'priority'
  | 'assignee'
  | 'type'
  | 'milestone'

export type IssueBoardProps = {
  issues: readonly Issue[]
  issuesHref: string
  groupBy?: IssueBoardGroupBy
  userLabels?: Readonly<Record<string, string>>
}

type IssueGroup = {
  key: string
  label: string
  tone: string
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

function issueGroupKey(issue: Issue, groupBy: IssueBoardGroupBy): string {
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

function issueGroupLabel(
  issue: Issue,
  groupBy: IssueBoardGroupBy,
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
      return issue.milestone?.name ?? 'No milestone'
    case 'status':
    default:
      return issue.state?.name ?? formatIssueStatus(issue.status)
  }
}

function issueGroupOrder(issue: Issue, groupBy: IssueBoardGroupBy): number {
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

function createGroups(
  issues: readonly Issue[],
  groupBy: IssueBoardGroupBy,
  userLabels: Readonly<Record<string, string>>
): IssueGroup[] {
  const groups = new Map<string, IssueGroup>()

  if (groupBy === 'status') {
    ISSUE_STATUSES.forEach((status, order) => {
      groups.set(status, {
        key: status,
        label: formatIssueStatus(status),
        tone: issueStatusTone(status),
        issues: [],
        order,
      })
    })
  }

  for (const issue of issues) {
    const key = issueGroupKey(issue, groupBy)
    const existing = groups.get(key)
    if (existing) {
      existing.issues.push(issue)
      if (groupBy === 'status' && issue.state?.name)
        existing.label = issue.state.name
      continue
    }

    groups.set(key, {
      key,
      label: issueGroupLabel(issue, groupBy, userLabels),
      tone: groupBy === 'status' ? issueStatusTone(issue.status) : 'bg-slate-400',
      issues: [issue],
      order: issueGroupOrder(issue, groupBy),
    })
  }

  return [...groups.values()].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order
    return left.label.localeCompare(right.label)
  })
}

export function IssueBoardCard({
  issue,
  issuesHref,
  userLabels = {},
}: {
  issue: Issue
  issuesHref: string
  userLabels?: Readonly<Record<string, string>>
}) {
  return (
    <div className="bg-card active:bg-muted/70 group relative flex flex-col gap-1.5 rounded-2xl px-3.5 py-3 transition-colors">
      <Link
        href={`${issuesHref}/${issue.identifier}`}
        className="text-[0.9375rem] leading-snug focus-visible:outline-none"
      >
        {issue.title}
      </Link>

      <div className="text-muted-foreground flex items-center gap-2 text-[0.8125rem]">
        <Link
          href={`${issuesHref}/${issue.identifier}`}
          className="focus-visible:ring-ring shrink-0 rounded-xs tabular-nums focus-visible:ring-2 focus-visible:outline-none"
        >
          {issue.identifier}
        </Link>
        {issue.priority !== 'none' ? (
          <span className="shrink-0">{formatIssuePriority(issue.priority)}</span>
        ) : null}
        {issue.labels.map((label) => (
          <span key={label.id} className="flex min-w-0 items-center gap-1">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: label.color ?? 'currentColor' }}
            />
            <span className="truncate">{label.name}</span>
          </span>
        ))}
        {issue.assigneeUserId ? (
          <span className="ml-auto truncate text-xs">
            {userLabels[issue.assigneeUserId] ?? issue.assigneeUserId}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function IssueBoardColumn({
  group,
  issuesHref,
  userLabels = {},
}: {
  group: IssueGroup
  issuesHref: string
  userLabels?: Readonly<Record<string, string>>
}) {
  return (
    <div className="bg-muted/40 flex min-w-0 flex-1 flex-col rounded-[1.375rem] p-2.5">
      <div className="mb-2 flex items-center justify-between px-2 pt-1">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">
          {group.label}
        </h2>
        <span className="text-muted-foreground text-[0.8125rem] tabular-nums">
          {group.issues.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
        {group.issues.length === 0 ? (
          <div className="text-muted-foreground/60 flex flex-1 items-center justify-center py-8 text-[0.8125rem]">
            No issues
          </div>
        ) : (
          group.issues.map((issue) => (
            <IssueBoardCard
              key={issue.id}
              issue={issue}
              issuesHref={issuesHref}
              userLabels={userLabels}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function IssueBoard({
  issues,
  issuesHref,
  groupBy = 'status',
  userLabels = {},
}: IssueBoardProps) {
  const groups = createGroups(issues, groupBy, userLabels)

  return (
    <>
      <div className="-mx-4 sm:hidden">
        {groups.map((group) => (
          <section key={group.key} aria-label={group.label}>
            <div className="bg-876-canvas/90 sticky top-0 z-10 flex items-center gap-2 px-4 pt-5 pb-1.5 backdrop-blur-xl">
              <span
                aria-hidden="true"
                className={`size-2.5 rounded-full ${group.tone}`}
              />
              <span className="text-[0.9375rem] font-semibold">
                {group.label}
              </span>
              <span className="text-muted-foreground ml-auto text-[0.8125rem] tabular-nums">
                {group.issues.length}
              </span>
            </div>
            <MobileList className="mx-0">
              {group.issues.length === 0 ? (
                <MobileListEmpty>No issues</MobileListEmpty>
              ) : (
                group.issues.map((issue) => (
                  <MobileListCell
                    key={issue.id}
                    href={`${issuesHref}/${issue.identifier}`}
                    label={`View issue ${issue.identifier}`}
                    avatar={issue.projectKey.slice(0, 2)}
                    avatarClassName={issueStatusTone(issue.status)}
                    title={issue.title}
                    subtitle={
                      issue.priority === 'none'
                        ? issue.identifier
                        : `${issue.identifier} · ${formatIssuePriority(issue.priority)}`
                    }
                    meta={
                      issue.assigneeUserId
                        ? userLabels[issue.assigneeUserId] ?? issue.assigneeUserId
                        : undefined
                    }
                  />
                ))
              )}
            </MobileList>
          </section>
        ))}
      </div>
      <div className="hidden gap-4 pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {groups.map((group) => (
          <IssueBoardColumn
            key={group.key}
            group={group}
            issuesHref={issuesHref}
            userLabels={userLabels}
          />
        ))}
      </div>
    </>
  )
}
