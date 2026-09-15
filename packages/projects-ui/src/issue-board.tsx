'use client'

import Link from 'next/link'
import {
  ISSUE_STATUSES,
  type Issue,
  type IssueStatus,
} from '@876/projects/contracts'

import { formatIssuePriority } from './priority-badges'
import { formatIssueStatus, issueStatusTone } from './status-badges'
import { MobileList, MobileListCell, MobileListEmpty } from './mobile-list'

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
          <span className="shrink-0">
            {formatIssuePriority(issue.priority)}
          </span>
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
    <div className="bg-muted/40 flex min-w-0 flex-1 flex-col rounded-[1.375rem] p-2.5">
      <div className="mb-2 flex items-center justify-between px-2 pt-1">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">
          {formatIssueStatus(status)}
        </h2>
        <span className="text-muted-foreground text-[0.8125rem] tabular-nums">
          {issues.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
        {issues.length === 0 ? (
          <div className="text-muted-foreground/60 flex flex-1 items-center justify-center py-8 text-[0.8125rem]">
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
    <>
      <div className="-mx-4 sm:hidden">
        {ISSUE_STATUSES.map((status) => {
          const bucket = byStatus[status] ?? []

          return (
            <section key={status} aria-label={formatIssueStatus(status)}>
              <div className="bg-876-canvas/90 sticky top-0 z-10 flex items-center gap-2 px-4 pt-5 pb-1.5 backdrop-blur-xl">
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-full ${issueStatusTone(status)}`}
                />
                <span className="text-[0.9375rem] font-semibold">
                  {formatIssueStatus(status)}
                </span>
                <span className="text-muted-foreground ml-auto text-[0.8125rem] tabular-nums">
                  {bucket.length}
                </span>
              </div>
              <MobileList className="mx-0">
                {bucket.length === 0 ? (
                  <MobileListEmpty>No issues</MobileListEmpty>
                ) : (
                  bucket.map((issue) => (
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
                    />
                  ))
                )}
              </MobileList>
            </section>
          )
        })}
      </div>
      <div className="hidden gap-4 pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {ISSUE_STATUSES.map((status) => (
          <IssueBoardColumn
            key={status}
            status={status}
            issues={byStatus[status] ?? []}
            issuesHref={issuesHref}
          />
        ))}
      </div>
    </>
  )
}
