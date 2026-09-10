import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Mirrors the columns in `prices-table.tsx` during streamed navigation. */
export const PRICES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Catalog target' },
  { label: 'Amount' },
  { label: 'Cadence' },
  { label: 'Model' },
  { label: 'Status', cell: 'badge' },
  { label: 'Actions', srOnly: true, width: '3rem' },
]
