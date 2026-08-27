import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const TEAMS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Name' },
  { label: 'Members', cell: 'avatar' },
  { label: 'Default', cell: 'badge' },
  { label: 'Auto-assign' },
  { label: 'Status', cell: 'badge' },
  { label: 'Created' },
]
