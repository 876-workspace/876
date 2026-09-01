import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** The real profiles-table columns, so the fallback cannot drift from the table. */
export const PROFILES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Profile' },
  { label: 'Description' },
  { label: 'Published revision' },
  { label: 'Conditions' },
  { label: 'Organizations' },
  { label: 'Status', cell: 'badge' },
]
