import { Badge } from '@876/ui/badge'

export type TimesheetApprovalStatus =
  'draft' | 'submitted' | 'approved' | 'rejected'

const APPROVAL_STATUS: Record<
  TimesheetApprovalStatus,
  {
    label: string
    variant: 'secondary' | 'info' | 'success' | 'destructive'
  }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
}

export function ApprovalStatusBadge({
  status,
}: {
  status: TimesheetApprovalStatus
}) {
  const { label, variant } = APPROVAL_STATUS[status]

  return <Badge variant={variant}>{label}</Badge>
}

/** Whole hours and minutes: a time entry is never reported as a decimal. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder}m`

  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}
