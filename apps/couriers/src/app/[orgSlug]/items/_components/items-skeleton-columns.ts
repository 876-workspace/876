import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Mirrors the `columns` in `items-table.tsx`. Keep the two in step — a mismatch
 * makes the header row change as the rows stream in, which is exactly what
 * rendering the real labels in the fallback exists to prevent.
 */
export const ITEMS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Name', cell: 'avatar' },
  { label: 'SKU' },
  { label: 'Price' },
  { label: 'Description' },
]
