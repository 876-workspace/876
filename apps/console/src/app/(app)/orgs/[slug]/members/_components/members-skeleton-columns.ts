import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const MEMBERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Name', cell: 'avatar' },
  { label: 'Email' },
  { label: 'Role', cell: 'badge' },
  { label: 'Status', cell: 'badge' },
  { label: 'Joined' },
]
