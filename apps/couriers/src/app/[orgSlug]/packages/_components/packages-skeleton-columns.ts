import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Keep this aligned with the full package table to avoid header layout shifts. */
export const PACKAGES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Tracking #' },
  { label: 'Customer', cell: 'avatar' },
  { label: 'Description' },
  { label: 'Category' },
  { label: 'Branch' },
  { label: 'Status' },
]
