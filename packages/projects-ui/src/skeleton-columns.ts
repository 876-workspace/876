import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * The real column sets for the tables in this package.
 *
 * They live beside the tables they describe so a fallback and its loaded table
 * cannot drift, and so every host renders the same shape while data is in
 * flight rather than each keeping its own copy.
 */
export const PROJECTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Project' },
  { label: 'Key', width: '90px' },
  { label: 'Lead' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Health', cell: 'badge', width: '110px' },
  { label: 'Target Date', width: '130px' },
]

export const PHASES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Phase' },
  { label: 'Project' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Owner', width: '150px' },
  { label: 'Target', width: '130px' },
]

export const ISSUES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Identifier', width: '120px' },
  { label: 'Title' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Priority', cell: 'badge', width: '100px' },
  { label: 'Project', width: '100px' },
  { label: 'Assignee', width: '120px' },
  { label: 'Updated', width: '130px' },
]

export const LABELS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Label', width: '150px' },
  { label: 'Color', width: '120px' },
  { label: 'Description' },
]
