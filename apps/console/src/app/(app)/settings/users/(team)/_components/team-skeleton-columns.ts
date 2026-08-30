import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** The Team table's real column set, shared by the table and its fallback. */
export const TEAM_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Name' },
  { label: 'Email' },
  { label: 'Position' },
  { label: 'Role', cell: 'badge' },
]
