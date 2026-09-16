import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/** The template list's columns, so its skeleton is the table it is waiting for. */
export const TEMPLATE_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Template', cell: 'avatar' },
  { label: 'Key' },
  { label: 'Version', cell: 'badge' },
  { label: 'Counts' },
  { label: 'Updated' },
]
