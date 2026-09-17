import type { TimeEntry } from '@876/projects/contracts'
import type { TimeEntryListRow } from '@876/projects-ui/time-entry-list'
import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

import type { TimeEntryLookups } from '@/types/time'

export type { TimeEntryLookups }

/** The four states the table renders a badge for; anything else is still a draft. */
export function toApprovalStatus(
  value: string
): TimeEntryListRow['approvalStatus'] {
  if (value === 'submitted' || value === 'approved' || value === 'rejected')
    return value

  return 'draft'
}

/**
 * A running entry has no duration yet, and the list must not invent one — the
 * service derives it when the timer stops.
 */
export function toTimeEntryRows(
  entries: readonly TimeEntry[],
  lookups: TimeEntryLookups
): TimeEntryListRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    startedAt: entry.startedAt,
    durationMinutes: entry.durationMinutes ?? 0,
    billable: entry.billable,
    note: entry.note,
    approvalStatus: toApprovalStatus(entry.approvalStatus),
    projectName: lookups.projectNames.get(entry.projectId) ?? entry.projectId,
    issue: entry.issueId
      ? {
          id: entry.issueId,
          title: lookups.issueTitles.get(entry.issueId) ?? entry.issueId,
        }
      : null,
  }))
}

/** The real column set of the time-entry table, so a fallback cannot drift. */
export const TIME_ENTRY_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Date', width: '120px' },
  { label: 'Project' },
  { label: 'Work item' },
  { label: 'Note' },
  { label: 'Duration', width: '90px' },
  { label: 'Billable', width: '110px' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Actions', srOnly: true, width: '160px' },
]
