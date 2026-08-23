import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const SUBSCRIPTIONS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Plan' },
  { label: 'App', cell: 'avatar' },
  { label: 'Payment Method' },
  { label: 'Started' },
]
