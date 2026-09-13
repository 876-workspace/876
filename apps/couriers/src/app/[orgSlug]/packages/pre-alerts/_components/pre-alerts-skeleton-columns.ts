import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Mirrors the `columns` in `pre-alerts-table.tsx`. Keep the two in step — a
 * mismatch makes the header row change as the rows stream in, which is exactly
 * what rendering the real labels in the fallback exists to prevent.
 */
export const PRE_ALERTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Reference' },
  { label: 'Customer' },
  { label: 'Status', cell: 'badge' },
]
