'use client'

import Link from 'next/link'
import {
  ISSUE_STATUSES,
  type Issue,
  type IssueStatus,
} from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'

import { IssuePriorityBadge } from './priority-badges'
import { formatIssueStatus } from './status-badges'

export type IssueBoardProps = {
  issues: readonly Issue[]
  issuesHref: string
}

export function IssueBoardCard({
  issue,
  issuesHref,
}: {
  issue: Issue
  issuesHref: string
}) {
  return (
    <div className="876-card hover:border-border/80 group relative flex flex-col gap-2 p-3 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`${issuesHref}/${issue.identifier}`}
          className="text-info focus-visible:ring-ring rounded-xs font-mono text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {issue.identifier}
        </Link>
        <IssuePriorityBadge priority={issue.priority} />
      </div>

      <Link
        href={`${issuesHref}/${issue.identifier}`}
        className="text-[0.8125rem] leading-snug font-medium group-hover:text-sky-600 dark:group-hover:text-sky-400"
      >
        {issue.title}
      </Link>

      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 pt-1 text-xs">
        <Badge variant="outline" className="px-1.5 py-0 text-[0.6875rem]">
          {issue.projectKey}
        </Badge>
        {issue.labels.map((label) => (
          <Badge
            key={label.id}
            variant="secondary"
            className="px-1.5 py-0 text-[0.6875rem]"
            style={
              label.color
                ? { borderLeft: `3px solid ${label.color}` }
                : undefined
            }
          >
            {label.name}
          </Badge>
        ))}
        {issue.assigneeUserId ? (
          <span className="ml-auto font-mono text-[0.6875rem]">
            {issue.assigneeUserId}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function IssueBoardColumn({
  status,
  issues,
  issuesHref,
}: {
  status: IssueStatus
  issues: readonly Issue[]
  issuesHref: string
}) {
  return (
    <div className="bg-muted/30 border-border/60 flex min-w-[280px] flex-1 flex-col rounded-xl border p-3 sm:min-w-0">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {formatIssueStatus(status)}
        </h2>
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
          {issues.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
        {issues.length === 0 ? (
          <div className="border-border/40 text-muted-foreground/60 flex flex-1 items-center justify-center rounded-lg border border-dashed py-8 text-xs">
            No issues
          </div>
        ) : (
          issues.map((issue) => (
            <IssueBoardCard
              key={issue.id}
              issue={issue}
              issuesHref={issuesHref}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function IssueBoard({ issues, issuesHref }: IssueBoardProps) {
  // `status` is a tenant-defined workflow-state key at the wire boundary, so
  // this board (which only renders the legacy six-status layout) buckets by
  // string key and silently drops issues in a tenant-defined state it does
  // not have a column for.
  const byStatus: Record<string, Issue[]> = {}
  for (const status of ISSUE_STATUSES) byStatus[status] = []

  for (const issue of issues) {
    const bucket = byStatus[issue.status]
    if (bucket) bucket.push(issue)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-x-visible lg:grid-cols-3 xl:grid-cols-6">
      {ISSUE_STATUSES.map((status) => (
        <IssueBoardColumn
          key={status}
          status={status}
          issues={byStatus[status] ?? []}
          issuesHref={issuesHref}
        />
      ))}
    </div>
  )
}
