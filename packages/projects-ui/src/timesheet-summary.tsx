import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

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

export type TimesheetSummaryEntry = {
  id: string
  startedAt: number
  durationMinutes: number
  billable: boolean
  projectId: string
  projectName: string
}

export type TimesheetSummaryGroup = {
  key: string
  label: string
  billableMinutes: number
  totalMinutes: number
}

export type TimesheetSummaryProps = {
  periodStart: number
  periodEnd: number
  status: TimesheetApprovalStatus
  submittedAt: number | null
  submittedBy: string | null
  decidedAt: number | null
  decidedBy: string | null
  entries: readonly TimesheetSummaryEntry[]
  groupBy: 'project' | 'day'
}

const DAY_SECONDS = 86400

const DECIDED_LABELS: Record<TimesheetApprovalStatus, string> = {
  draft: 'Decided',
  submitted: 'Decided',
  approved: 'Approved',
  rejected: 'Rejected',
}

function totalOf(entries: readonly TimesheetSummaryEntry[]): number {
  return entries.reduce((total, entry) => total + entry.durationMinutes, 0)
}

function TimesheetGroupCell({
  group,
  periodStart,
  periodEnd,
}: {
  group: TimesheetSummaryGroup
  periodStart: number
  periodEnd: number
}) {
  return (
    <MobileListCell
      avatar={group.label.slice(0, 2).toUpperCase()}
      avatarClassName={avatarTone(group.label)}
      title={group.label}
      subtitle={`${formatDate(periodStart)} – ${formatDate(periodEnd)}`}
      meta={formatDuration(group.totalMinutes)}
    />
  )
}

function groupEntries(
  entries: readonly TimesheetSummaryEntry[],
  groupBy: 'project' | 'day'
): TimesheetSummaryGroup[] {
  const groups = new Map<string, TimesheetSummaryGroup>()

  for (const entry of entries) {
    const dayStart = Math.floor(entry.startedAt / DAY_SECONDS) * DAY_SECONDS
    const key = groupBy === 'project' ? entry.projectId : String(dayStart)
    const group = groups.get(key) ?? {
      key,
      label: groupBy === 'project' ? entry.projectName : formatDate(dayStart),
      billableMinutes: 0,
      totalMinutes: 0,
    }

    group.totalMinutes += entry.durationMinutes
    if (entry.billable) group.billableMinutes += entry.durationMinutes
    groups.set(key, group)
  }

  const list = [...groups.values()]
  if (groupBy === 'day')
    list.sort((left, right) => Number(left.key) - Number(right.key))

  return list
}

export function TimesheetSummary({
  periodStart,
  periodEnd,
  status,
  submittedAt,
  submittedBy,
  decidedAt,
  decidedBy,
  entries,
  groupBy,
}: TimesheetSummaryProps) {
  const totalMinutes = totalOf(entries)
  const billableMinutes = totalOf(entries.filter((entry) => entry.billable))
  const groups = groupEntries(entries, groupBy)

  const meta: string[] = []
  if (submittedAt !== null)
    meta.push(
      `Submitted${submittedBy ? ` by ${submittedBy}` : ''} on ${formatDate(submittedAt)}`
    )
  if (decidedAt !== null)
    meta.push(
      `${DECIDED_LABELS[status]}${decidedBy ? ` by ${decidedBy}` : ''} on ${formatDate(decidedAt)}`
    )

  return (
    <section className="876-card overflow-hidden">
      <div className="border-border/60 flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <p className="font-medium" data-period-range>
            {formatDate(periodStart)} – {formatDate(periodEnd)}
          </p>
          {meta.length > 0 ? (
            <p className="text-muted-foreground mt-1 text-xs">
              {meta.join(' · ')}
            </p>
          ) : null}
        </div>
        <ApprovalStatusBadge status={status} />
      </div>

      <dl className="border-border/60 grid gap-4 border-b px-5 py-4 sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground text-xs">Total</dt>
          <dd className="mt-0.5 font-medium tabular-nums" data-total="total">
            {formatDuration(totalMinutes)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Billable</dt>
          <dd className="mt-0.5 font-medium tabular-nums" data-total="billable">
            {formatDuration(billableMinutes)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Non-billable</dt>
          <dd
            className="mt-0.5 font-medium tabular-nums"
            data-total="non-billable"
          >
            {formatDuration(totalMinutes - billableMinutes)}
          </dd>
        </div>
      </dl>

      <div className="px-4">
        <MobileList>
          {groups.length === 0 ? (
            <MobileListEmpty>No time logged in this period.</MobileListEmpty>
          ) : (
            groups.map((group) => (
              <TimesheetGroupCell
                key={group.key}
                group={group}
                periodStart={periodStart}
                periodEnd={periodEnd}
              />
            ))
          )}
        </MobileList>
      </div>
      <div className="hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5">
                {groupBy === 'project' ? 'Project' : 'Day'}
              </TableHead>
              <TableHead className="px-5 py-3.5 text-right">Billable</TableHead>
              <TableHead className="px-5 py-3.5 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.key} data-group={group.key}>
                <TableCell className="px-5 py-4 font-medium">
                  {group.label}
                </TableCell>
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {formatDuration(group.billableMinutes)}
                </TableCell>
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {formatDuration(group.totalMinutes)}
                </TableCell>
              </TableRow>
            ))}
            {groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-muted-foreground px-5 py-8 text-center"
                >
                  No time logged in this period.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
