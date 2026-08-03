import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const USERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Avatar', srOnly: true, width: '48px', cell: 'avatar' },
  { label: 'Name', cell: 'avatar' },
  { label: 'Email' },
  { label: 'Company' },
  { label: 'Apps' },
  { label: 'Joined' },
]
