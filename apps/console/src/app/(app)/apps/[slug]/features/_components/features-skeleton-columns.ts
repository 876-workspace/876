import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const FEATURES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Name' },
  { label: 'Slug' },
  { label: 'Scope' },
  { label: 'Enabled', cell: 'badge' },
  { label: 'Updated' },
]
