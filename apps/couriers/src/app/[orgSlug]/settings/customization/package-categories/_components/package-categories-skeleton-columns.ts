import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Mirrors the `columns` in `package-categories-table.tsx`. Keep the two in
 * step — a mismatch makes the header row change as the rows stream in, which
 * is exactly what rendering the real labels in the fallback exists to
 * prevent.
 */
export const PACKAGE_CATEGORIES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Name' },
  { label: 'Slug' },
  { label: 'Description' },
  { label: 'Order' },
  { label: 'Status', cell: 'badge' },
  { label: 'Source', cell: 'badge' },
]
