'use client'

import Link from 'next/link'
import type { Issue } from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { buttonVariants } from '@876/ui/button'
import { ClipboardList, Plus } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { IssuePriorityBadge } from './priority-badges'
import { IssueStatusBadge } from './status-badges'

export type IssuesTableProps = {
  issues: readonly Issue[]
  issuesHref: string
  newIssueHref?: string | null
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
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
        />
        <span className="text-info">{issue.identifier}</span>
      </TableCell>
      <TableCell className="relative px-5 py-4">
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
      <TableCell className="px-5 py-4 font-mono text-xs text-muted-foreground">
        {issue.projectKey}
      </TableCell>
      <TableCell className="px-5 py-4 text-xs text-muted-foreground">
        {issue.assigneeUserId ? (
          <span className="font-mono">{issue.assigneeUserId}</span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(issue.updatedAt)}
      </TableCell>
    </TableRow>
  )
}

export function IssuesTable({
  issues,
  issuesHref,
  newIssueHref,
}: IssuesTableProps) {
  return (
    <div className="876-card overflow-hidden">
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
  )
}
