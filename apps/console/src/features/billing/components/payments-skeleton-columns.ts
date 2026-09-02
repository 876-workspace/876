import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Mirrors the shared payments table so the fallback cannot drift from it. */
export const BILLING_PAYMENTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Payment' },
  { label: 'Customer' },
  { label: 'Deposit account' },
  { label: 'Amount' },
  { label: 'Date' },
  { label: 'Status', cell: 'badge' },
]
