import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const ORGS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Name', cell: 'avatar' },
  { label: 'Slug' },
  { label: 'Apps' },
  { label: 'Status', cell: 'badge' },
  { label: 'Created' },
]
