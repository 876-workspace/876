import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const AUDIT_LOG_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Time' },
  { label: 'App', cell: 'badge' },
  { label: 'Event' },
  { label: 'Route' },
  { label: 'User' },
  { label: 'Request' },
]
