export const PRE_ALERT_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Pre-alerts' },
  { value: 'pending', label: 'Pending', headingLabel: 'Pending Pre-alerts' },
  { value: 'received', label: 'Received', headingLabel: 'Received Pre-alerts' },
  {
    value: 'cancelled',
    label: 'Cancelled',
    headingLabel: 'Cancelled Pre-alerts',
  },
]

export const PRE_ALERTS_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const },
  { label: 'Export', icon: 'export' as const },
  {
    label: 'Delete pre-alerts',
    icon: 'delete' as const,
    destructive: true,
    separator: true,
  },
]

const PRE_ALERT_STATUS_VALUES = new Set(
  PRE_ALERT_STATUS_OPTIONS.map((option) => option.value).filter(
    (value) => value !== 'all'
  )
)

/** An absent or unknown `?status=` value means no filter. */
export function resolvePreAlertStatusFilter(
  status: string | null | undefined
): string {
  return status && PRE_ALERT_STATUS_VALUES.has(status) ? status : 'all'
}
