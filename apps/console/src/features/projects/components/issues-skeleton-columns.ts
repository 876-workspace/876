import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Real columns matching IssuesTable so the skeleton and the loaded table cannot drift.
 */
export const ISSUES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Identifier', width: '120px' },
  { label: 'Title' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Priority', cell: 'badge', width: '100px' },
  { label: 'Project', width: '100px' },
  { label: 'Assignee', width: '120px' },
  { label: 'Updated', width: '130px' },
]
