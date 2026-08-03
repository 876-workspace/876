import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const USERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'User', cell: 'avatar' },
  { label: 'Role' },
  { label: 'Status', cell: 'badge' },
]
