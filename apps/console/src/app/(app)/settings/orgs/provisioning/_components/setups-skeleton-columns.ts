import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** The real setups-table columns, so the fallback cannot drift from the table. */
export const SETUPS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Setup' },
  { label: 'Country' },
  { label: 'Currency' },
  { label: 'Revision' },
  { label: 'Organizations' },
  { label: 'Status', cell: 'badge' },
]
