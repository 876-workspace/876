import type { StatusFilterOption } from '@876/ui/status-filter-heading'

export type ApprovalFilterStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'all'

export const TIME_ENTRY_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All entries', headingLabel: 'All Time Entries' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Time Entries' },
  {
    value: 'submitted',
    label: 'Submitted',
    headingLabel: 'Submitted Time Entries',
  },
  {
    value: 'approved',
    label: 'Approved',
    headingLabel: 'Approved Time Entries',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    headingLabel: 'Rejected Time Entries',
  },
]

export const TIMESHEET_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All timesheets', headingLabel: 'All Timesheets' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Timesheets' },
  {
    value: 'submitted',
    label: 'Submitted',
    headingLabel: 'Submitted Timesheets',
  },
  {
    value: 'approved',
    label: 'Approved',
    headingLabel: 'Approved Timesheets',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    headingLabel: 'Rejected Timesheets',
  },
]

const APPROVAL_STATUSES: readonly string[] = [
  'draft',
  'submitted',
  'approved',
  'rejected',
]

export function isApprovalStatus(
  status: string | undefined
): status is Exclude<ApprovalFilterStatus, 'all'> {
  if (!status) return false
  return APPROVAL_STATUSES.includes(status)
}
