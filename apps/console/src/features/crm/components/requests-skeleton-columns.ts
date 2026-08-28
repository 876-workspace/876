import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const REQUESTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Request' },
  { label: 'Customer' },
  { label: 'Assignee' },
  { label: 'Status', cell: 'badge' },
  { label: 'Priority', cell: 'badge' },
  { label: 'Created' },
]
