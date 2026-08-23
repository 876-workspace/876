import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const SUBSCRIPTIONS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Plan' },
  { label: 'Status', cell: 'badge' },
  { label: 'Collection Method' },
  { label: 'Created' },
]
