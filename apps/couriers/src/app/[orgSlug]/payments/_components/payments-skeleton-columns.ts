import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Mirrors the columns of `@876/billing-ui/payments-table` during streamed navigation. */
export const PAYMENTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Payment' },
  { label: 'Customer' },
  { label: 'Deposit account' },
  { label: 'Amount' },
  { label: 'Date' },
  { label: 'Status', cell: 'badge' },
]
