'use client'

import { Button } from '@876/ui/button'
import { Pencil, Trash } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import Link from 'next/link'

import {
  ApprovalStatusBadge,
  formatDuration,
  type TimesheetApprovalStatus,
} from './time-tracking'
import { formatDate } from './format-date'
import {
  avatarTone,
  MobileList,
  MobileListCell,
  MobileListEmpty,
} from './mobile-list'

export type TimeEntryListRow = {
  id: string
  startedAt: number
  durationMinutes: number
  billable: boolean
  note: string | null
  approvalStatus: TimesheetApprovalStatus
  projectName: string
  issue: { id: string; title: string } | null
}

export type TimeEntryListProps = {
  entries: readonly TimeEntryListRow[]
  issuesBaseHref: string
  canEdit: boolean
  onEdit: (entry: TimeEntryListRow) => void
  onDelete: (entry: TimeEntryListRow) => void
  emptyTitle: string
}

function TimeEntryCell({
  entry,
  issuesBaseHref,
}: {
  entry: TimeEntryListRow
  issuesBaseHref: string
}) {
  const seed = entry.issue?.id ?? entry.projectName

  return (
    <MobileListCell
      href={
        entry.issue
          ? `${issuesBaseHref}/${encodeURIComponent(entry.issue.id)}`
          : undefined
      }
      label={entry.issue ? `View work item ${entry.issue.title}` : undefined}
      avatar={seed.slice(0, 2).toUpperCase()}
      avatarClassName={avatarTone(seed)}
      title={entry.issue?.title ?? entry.note ?? entry.projectName}
      subtitle={`${entry.projectName} · ${formatDate(entry.startedAt)}`}
      meta={formatDuration(entry.durationMinutes)}
    />
  )
}

export function TimeEntryList({
  entries,
  issuesBaseHref,
  canEdit,
  onEdit,
  onDelete,
  emptyTitle,
}: TimeEntryListProps) {
  if (entries.length === 0)
    return (
      <>
        <MobileList>
          <MobileListEmpty>{emptyTitle}</MobileListEmpty>
        </MobileList>
        <div className="876-card text-muted-foreground hidden px-5 py-10 text-center text-sm sm:block">
          {emptyTitle}
        </div>
      </>
    )

  return (
    <>
      <MobileList>
        {entries.map((entry) => (
          <TimeEntryCell
            key={entry.id}
            entry={entry}
            issuesBaseHref={issuesBaseHref}
          />
        ))}
      </MobileList>
      <div className="876-card hidden overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5">Date</TableHead>
              <TableHead className="px-5 py-3.5">Project</TableHead>
              <TableHead className="px-5 py-3.5">Work item</TableHead>
              <TableHead className="px-5 py-3.5">Note</TableHead>
              <TableHead className="px-5 py-3.5 text-right">Duration</TableHead>
              <TableHead className="px-5 py-3.5">Billable</TableHead>
              <TableHead className="px-5 py-3.5">Status</TableHead>
              <TableHead className="w-px px-5 py-3.5">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} data-time-entry={entry.id}>
                <TableCell className="text-muted-foreground px-5 py-4">
                  {formatDate(entry.startedAt)}
                </TableCell>
                <TableCell className="px-5 py-4 font-medium">
                  {entry.projectName}
                </TableCell>
                <TableCell className="px-5 py-4">
                  {entry.issue ? (
                    <Link
                      href={`${issuesBaseHref}/${encodeURIComponent(entry.issue.id)}`}
                      className="hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {entry.issue.title}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[18rem] truncate px-5 py-4">
                  {entry.note ? (
                    <span title={entry.note}>{entry.note}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {formatDuration(entry.durationMinutes)}
                </TableCell>
                <TableCell
                  className="px-5 py-4"
                  data-billable={entry.billable ? 'true' : 'false'}
                >
                  {entry.billable ? (
                    'Billable'
                  ) : (
                    <span className="text-muted-foreground">Non-billable</span>
                  )}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <ApprovalStatusBadge status={entry.approvalStatus} />
                </TableCell>
                <TableCell className="px-5 py-4">
                  {canEdit && entry.approvalStatus !== 'approved' ? (
                    <div
                      className="flex items-center justify-end gap-1"
                      data-entry-actions={entry.id}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(entry)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(entry)}
                      >
                        <Trash className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
