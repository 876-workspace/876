import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Kept beside the table it stands in for so the fallback and the loaded table
 * cannot drift (`CLAUDE.md` → Loading States & Suspense Placement). Console
 * renders the shared items table without its price-count column.
 */
export const BILLING_ITEMS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Item' },
  { label: 'Default price' },
  { label: 'Tax' },
  { label: 'Status' },
  { label: '' },
]
