import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Kept beside the table it stands in for so the fallback and the loaded table
 * cannot drift (`CLAUDE.md` → Loading States & Suspense Placement).
 */
export const CRM_CUSTOMERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Customer' },
  { label: 'Contact' },
  { label: 'Phone' },
  { label: 'Type' },
  { label: 'Status', cell: 'badge' },
]
