import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const CATEGORIES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Category', cell: 'badge' },
  { label: 'Subcategories' },
  { label: 'Default team' },
  { label: 'Default priority' },
  { label: 'Status', cell: 'badge' },
]
