import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const CUSTOMERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Customer' },
  { label: 'Contact' },
  { label: 'Type' },
  { label: 'Status', cell: 'badge' },
]
