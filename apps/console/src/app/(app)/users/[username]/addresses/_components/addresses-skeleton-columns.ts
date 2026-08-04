import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const ADDRESSES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Type / Label' },
  { label: 'Address' },
  { label: 'Default', cell: 'badge' },
  { label: 'Created' },
  { label: 'Actions', srOnly: true, width: '128px' },
]
