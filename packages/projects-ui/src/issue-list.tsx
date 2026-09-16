'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Issue } from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { buttonVariants } from '@876/ui/button'
import { ClipboardList, Plus } from '@876/ui/icons'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { isIssueStatus } from './status-options'
import { IssuePriorityBadge } from './priority-badges'
import {
  formatIssueStatus,
  IssueStatusBadge,
  issueStatusTone,
} from './status-badges'
import { formatDate } from './format-date'
import { MobileList, MobileListCell, MobileListEmpty } from './mobile-list'

export type IssuesTableProps = {
  issues: readonly Issue[]
  issuesHref: string
  newIssueHref?: string | null
  emptyState?: ReactNode
}

export type IssuesListProps = {
  issues: readonly Issue[]
  issuesHref: string
  newIssueHref?: string | null
  emptyState?: ReactNode
}

function IssueCell({
  issue,
  issuesHref,
}: {
  issue: Issue
  issuesHref: string
}) {
  return (
    <MobileListCell
      href={`${issuesHref}/${issue.identifier}`}
      label={`View issue ${issue.identifier}`}
      avatar={issue.projectKey.slice(0, 2)}
      avatarClassName={issueStatusTone(issue.status)}
      title={issue.title}
      subtitle={`${issue.identifier} · ${formatIssueStatus(issue.status)}`}
      meta={formatDate(issue.dueDate ?? issue.updatedAt)}
    />
  )
}

function RowLink({
  href,
  label,
  hidden = false,
}: {
  href: string
  label: string
  hidden?: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className="focus-visible:ring-ring absolute inset-0 z-10 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
    />
  )
}

export function IssueTableRow({
  issue,
  issuesHref,
}: {
  issue: Issue
  issuesHref: string
}) {
  return (
    <TableRow className="transition-colors">
      <TableCell className="relative px-5 py-4 font-mono text-xs font-semibold">
        <RowLink
          href={`${issuesHref}/${issue.identifier}`}
          label={`View issue ${issue.identifier}`}
          hidden
        />
        <span className="text-info">{issue.identifier}</span>
      </TableCell>
      <TableCell className="relative px-5 py-4">
        <RowLink
          href={`${issuesHref}/${issue.identifier}`}
          label={`View issue ${issue.identifier}`}
        />
        <div className="min-w-0">
          <span className="text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
            {issue.title}
          </span>
          {issue.labels && issue.labels.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  className="px-1.5 py-0 text-[0.6875rem]"
                  style={label.color ? { borderColor: label.color } : undefined}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="px-5 py-4">
        <IssueStatusBadge status={issue.status} />
      </TableCell>
      <TableCell className="px-5 py-4">
        <IssuePriorityBadge priority={issue.priority} />
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 font-mono text-xs">
        {issue.projectKey}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-xs">
        {issue.assigneeUserId ? (
          <span className="font-mono">{issue.assigneeUserId}</span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-xs whitespace-nowrap">
        {formatDate(issue.updatedAt)}
      </TableCell>
    </TableRow>
  )
}

export function IssuesTable({
  issues,
  issuesHref,
  newIssueHref,
  emptyState,
}: IssuesTableProps) {
  return (
    <>
      <MobileList>
        {issues.length === 0 ? (
          <MobileListEmpty>No issues yet</MobileListEmpty>
        ) : (
          issues.map((issue) => (
            <IssueCell key={issue.id} issue={issue} issuesHref={issuesHref} />
          ))
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Identifier
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Title
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Status
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Priority
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Project
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Assignee
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  {emptyState ?? (
                    <Empty className="py-14">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <ClipboardList className="size-6" />
                        </EmptyMedia>
                        <EmptyTitle>No issues yet</EmptyTitle>
                      </EmptyHeader>
                      {newIssueHref ? (
                        <EmptyContent>
                          <Link
                            href={newIssueHref}
                            className={buttonVariants({
                              variant: 'info',
                              size: 'sm',
                            })}
                          >
                            <Plus className="size-4" strokeWidth={2.25} />
                            Add
                          </Link>
                        </EmptyContent>
                      ) : null}
                    </Empty>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              issues.map((issue) => (
                <IssueTableRow
                  key={issue.id}
                  issue={issue}
                  issuesHref={issuesHref}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

/**
 * The list column for issue routes: the full table on its own, and
 * a condensed pane once an issue opens beside it.
 */
export function IssuesList({
  issues,
  issuesHref,
  newIssueHref,
  emptyState,
}: IssuesListProps) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  // The status filter is applied here rather than in the query because a
  // layout receives no `searchParams`, and the list has to live in the layout
  // to survive opening a record. The underlying call already returns the
  // tenant's whole issue set, so this narrows what was fetched either way.
  const status = searchParams.get('status') ?? undefined
  const rows = isIssueStatus(status)
    ? issues.filter((issue) => issue.status === status)
    : issues

  if (!selectedId)
    return (
      <IssuesTable
        issues={rows}
        issuesHref={issuesHref}
        newIssueHref={newIssueHref}
        emptyState={emptyState}
      />
    )

  return (
    <ListPane>
      <ListPaneHeader>Issues</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No issues yet</ListPaneEmpty>
        ) : (
          rows.map((issue) => (
            <ListPaneItem
              key={issue.id}
              href={
                query
                  ? `${issuesHref}/${issue.identifier}?${query}`
                  : `${issuesHref}/${issue.identifier}`
              }
              selected={issue.identifier === selectedId}
              label={`View issue ${issue.identifier}`}
              title={issue.identifier}
              subtitle={issue.title}
              trailing={<IssueStatusBadge status={issue.status} />}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
