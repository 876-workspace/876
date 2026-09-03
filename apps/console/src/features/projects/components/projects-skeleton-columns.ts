import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Real columns matching ProjectsTable so the skeleton and the loaded table cannot drift.
 */
export const PROJECTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Project' },
  { label: 'Key', width: '90px' },
  { label: 'Lead' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Health', cell: 'badge', width: '110px' },
  { label: 'Target Date', width: '130px' },
]
