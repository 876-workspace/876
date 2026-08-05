import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const SESSIONS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'User' },
  { label: 'Device' },
  { label: 'Location' },
  { label: 'IP' },
  { label: 'Status', cell: 'badge' },
  { label: 'Started' },
  { label: 'Last seen' },
]
