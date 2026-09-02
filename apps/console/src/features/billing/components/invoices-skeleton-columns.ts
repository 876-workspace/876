import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Mirrors the shared invoices table so the fallback cannot drift from it. */
export const BILLING_INVOICES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Invoice' },
  { label: 'Customer' },
  { label: 'Total' },
  { label: 'Amount due' },
  { label: 'Status', cell: 'badge' },
]
