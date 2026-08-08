import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Mirrors the `columns` in `customers-table.tsx`. Keep the two in step — a
 * mismatch makes the header row change as the rows stream in, which is exactly
 * what rendering the real labels in the fallback exists to prevent.
 */
export const CUSTOMERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Name', cell: 'avatar' },
  { label: 'Company', cell: 'avatar' },
  { label: 'Email' },
  { label: 'Phone' },
]
