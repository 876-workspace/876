import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const CYCLES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Cycle' },
  { label: 'Project' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Dates', width: '200px' },
  { label: 'Progress', width: '130px' },
]
