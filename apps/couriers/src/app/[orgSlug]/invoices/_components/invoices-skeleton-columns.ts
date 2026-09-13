import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** Mirrors the columns of `@876/billing-ui/invoices-table` during streamed navigation. */
export const INVOICES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Invoice' },
  { label: 'Customer' },
  { label: 'Total' },
  { label: 'Amount due' },
  { label: 'Status', cell: 'badge' },
]
