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

export const LAYOUTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Layout' },
  { label: 'Entity', width: '130px' },
  { label: 'Type', width: '150px' },
  { label: 'Default', cell: 'badge', width: '110px' },
  { label: 'Version', width: '90px' },
]

export const PROJECT_FIELDS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Field' },
  { label: 'Key', width: '180px' },
  { label: 'Type', width: '130px' },
  { label: 'Required', cell: 'badge', width: '110px' },
]

export const WORKFLOWS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'From', width: '150px' },
  { label: 'To', width: '150px' },
  { label: 'Transition' },
  { label: 'Permission', width: '170px' },
  { label: 'Comment', cell: 'badge', width: '110px' },
]

export const AUTOMATION_RULES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Rule' },
  { label: 'Trigger', width: '200px' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Actions', width: '110px' },
  { label: 'Updated', width: '130px' },
]

export const AUTOMATION_RUNS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Rule', width: '150px' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Error', width: '170px' },
  { label: 'Attempt', width: '90px' },
  { label: 'Started', width: '150px' },
  { label: 'Finished', width: '150px' },
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

export const CUSTOM_MODULES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Module' },
  { label: 'Scope', cell: 'badge', width: '130px' },
  { label: 'Fields', width: '110px' },
  { label: 'Records', width: '110px' },
  { label: 'Updated', width: '130px' },
]

export const CUSTOM_MODULE_RECORDS_SKELETON_COLUMNS: DataTableSkeletonColumn[] =
  [
    { label: 'Title' },
    { label: 'Status', cell: 'badge', width: '130px' },
    { label: 'Updated', width: '130px' },
  ]

export const INTEGRATIONS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Client' },
  { label: 'Scopes', width: '200px' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Last used', width: '130px' },
  { label: 'Created', width: '130px' },
]

export const WEBHOOK_ENDPOINTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'URL' },
  { label: 'Events', width: '130px' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Failures', width: '110px' },
]

export const WEBHOOK_DELIVERIES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Event type' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Response', width: '110px' },
  { label: 'Attempt', width: '90px' },
  { label: 'Next attempt', width: '150px' },
]

export const IMPORT_JOBS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Source' },
  { label: 'Status', cell: 'badge', width: '110px' },
  { label: 'Rows', width: '130px' },
  { label: 'Created', width: '130px' },
]
