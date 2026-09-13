import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Mirrors the `columns` in `deliveries-table.tsx`. Keep the two in step — a
 * mismatch makes the header row change as the rows stream in, which is exactly
 * what rendering the real labels in the fallback exists to prevent.
 */
export const DELIVERIES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Customer' },
  { label: 'Code' },
  { label: 'Area' },
  { label: 'Date & Time' },
  { label: 'Packages' },
  { label: 'Status', cell: 'badge' },
]
