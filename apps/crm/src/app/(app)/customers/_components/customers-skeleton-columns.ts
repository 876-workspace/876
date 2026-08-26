import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Mirrors the columns in `customers-table.tsx` during streamed navigation. */
export const CUSTOMERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Customer', cell: 'avatar' },
  { label: 'Email' },
  { label: 'Phone' },
  { label: 'Status', cell: 'badge' },
]
