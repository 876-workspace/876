import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Mirrors the columns in `requests-table.tsx` during streamed navigation. */
export const REQUESTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Request' },
  { label: 'Customer' },
  { label: 'Status', cell: 'badge' },
  { label: 'Priority', cell: 'badge' },
  { label: 'Category' },
  { label: 'Created' },
]
