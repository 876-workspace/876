import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Mirrors the `columns` in `disputes-table.tsx`. Keep the two in step — a
 * mismatch makes the header row change as the rows stream in, which is exactly
 * what rendering the real labels in the fallback exists to prevent.
 */
export const DISPUTES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Date' },
  { label: 'Dispute #' },
  { label: 'Customer' },
  { label: 'Payment #' },
  { label: 'Reason' },
  { label: 'Status', cell: 'badge' },
]
