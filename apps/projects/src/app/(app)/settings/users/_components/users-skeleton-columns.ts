import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const USERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Member', cell: 'avatar' },
  { label: 'Email', cell: 'text' },
  { label: 'Position', cell: 'text' },
  { label: 'Organization role', cell: 'badge' },
  { label: 'Status', cell: 'badge' },
]
