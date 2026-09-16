import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * The real column sets of the Console-local operator tables, so each fallback
 * and its loaded table cannot drift. Mirrors the shared sets in
 * `@876/projects-ui/skeleton-columns` for the tables that package owns.
 */
export const CYCLES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Cycle' },
  { label: 'Project' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Dates', width: '200px' },
  { label: 'Progress', width: '130px' },
]

export const TASK_LISTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Task list' },
  { label: 'Phase', width: '180px' },
  { label: 'Owner', width: '150px' },
  { label: 'Progress', width: '130px' },
  { label: 'Target', width: '130px' },
]

export const TEMPLATES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Template' },
  { label: 'Key', width: '180px' },
  { label: 'Version', width: '110px' },
  { label: 'Counts' },
  { label: 'Updated', width: '130px' },
]

export const CALENDAR_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Date', width: '130px' },
  { label: 'Title' },
  { label: 'Kind', cell: 'badge', width: '110px' },
  { label: 'Project', width: '180px' },
]

export const OPERATOR_TIME_ENTRY_SKELETON_COLUMNS: DataTableSkeletonColumn[] =
  [
    { label: 'Date', width: '120px' },
    { label: 'Project' },
    { label: 'Work item' },
    { label: 'Note' },
    { label: 'Duration', width: '90px' },
    { label: 'Billable', width: '110px' },
    { label: 'Status', cell: 'badge', width: '110px' },
  ]

export const TIMESHEETS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Period' },
  { label: 'Member', width: '150px' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Submitted', width: '130px' },
  { label: 'Updated', width: '130px' },
]

export const ATTACHMENTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Name' },
  { label: 'Size', width: '110px' },
  { label: 'Type', width: '200px' },
  { label: 'Added by', width: '150px' },
]
