import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Mirrors the columns of `@876/billing-ui/items-table` during streamed navigation. */
export const ITEMS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Item' },
  { label: 'Default price' },
  { label: 'Stock' },
  { label: 'Tax' },
  { label: 'Status' },
  { label: 'Actions', srOnly: true, width: '3rem' },
]
