import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const MEMBERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Member', cell: 'avatar' },
  { label: 'Role', cell: 'badge' },
  { label: 'Status', cell: 'badge' },
  { label: 'Joined' },
]
