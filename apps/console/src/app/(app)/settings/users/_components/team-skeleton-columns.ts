import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const TEAM_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Avatar', srOnly: true, width: '3rem', cellWidth: '1.5rem' },
  { label: 'Name' },
  { label: 'Email' },
  { label: 'Role', cell: 'badge' },
]
