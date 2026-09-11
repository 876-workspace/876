/** Column set shared by the recurring-invoices table and its skeleton fallback. */
export const RECURRING_INVOICES_SKELETON_COLUMNS = [
  { label: 'Profile', cell: 'avatar' as const },
  { label: 'Customer' },
  { label: 'Frequency' },
  { label: 'Next run' },
  { label: 'Last run' },
  { label: 'Total' },
  { label: 'Status', cell: 'badge' as const },
]
