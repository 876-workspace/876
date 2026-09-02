import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Mirrors the shared customers table so the fallback cannot drift from it. */
export const BILLING_CUSTOMERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Customer' },
  { label: 'Company' },
  { label: 'Contact' },
  { label: 'Phone' },
  { label: 'Receivables' },
]
