import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * The real column set the users table renders.
 *
 * Kept beside the table so the Suspense fallback and the loaded table cannot
 * drift — a skeleton with different columns is the layout shift `CLAUDE.md`
 * forbids.
 */
export const USERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Member', cell: 'avatar' },
  { label: 'Email', cell: 'text' },
  { label: 'Position', cell: 'text' },
  { label: 'Organization role', cell: 'badge' },
  { label: 'Status', cell: 'badge' },
]
