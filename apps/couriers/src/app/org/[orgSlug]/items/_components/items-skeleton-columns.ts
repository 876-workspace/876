import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const ITEMS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Item' },
  { label: 'Type', cell: 'badge' },
  { label: 'Origin' },
  { label: 'Default price' },
]
