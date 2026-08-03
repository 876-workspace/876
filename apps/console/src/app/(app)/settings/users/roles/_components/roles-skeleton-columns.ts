import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const ROLES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Role' },
  { label: 'Type', cell: 'badge' },
  { label: 'Permissions' },
  { label: 'Users' },
]
