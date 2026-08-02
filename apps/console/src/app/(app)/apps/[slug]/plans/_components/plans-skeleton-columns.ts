import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const PLANS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Name' },
  { label: 'Price' },
  { label: 'Status', cell: 'badge' },
  { label: 'Updated' },
]
