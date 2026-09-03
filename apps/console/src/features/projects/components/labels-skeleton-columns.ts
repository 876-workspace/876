import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Real columns matching LabelsTable so the skeleton and the loaded table cannot drift.
 */
export const LABELS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Label', width: '150px' },
  { label: 'Color', width: '120px' },
  { label: 'Description' },
]
