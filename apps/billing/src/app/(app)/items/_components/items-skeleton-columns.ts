import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Mirrors the columns in `items-table.tsx` during streamed navigation. */
export const ITEMS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Item', cell: 'avatar' },
  { label: 'Default price' },
  { label: 'Stock' },
  { label: 'Tax' },
  { label: 'Prices' },
  { label: 'Status', cell: 'badge' },
  { label: 'Actions', srOnly: true, width: '3rem' },
]
