import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

import { reportGroupLabel, type ReportGroup } from '../report-query'

/** Column shapes matching the report tables in `@876/projects-ui/reports`. */

export const HEALTH_REPORT_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Project' },
  { label: 'Health', cell: 'badge', width: '110px' },
  { label: 'Progress', width: '90px' },
  { label: 'Overdue', width: '90px' },
  { label: 'Budget used', width: '110px' },
]

export function timeReportSkeletonColumns(
  groupBy: ReportGroup
): DataTableSkeletonColumn[] {
  return [
    { label: reportGroupLabel(groupBy) },
    { label: 'Billable', width: '110px' },
    { label: 'Non-billable', width: '130px' },
    { label: 'Total', width: '110px' },
  ]
}

export const BUDGET_VARIANCE_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Project' },
  { label: 'Budget', width: '110px' },
  { label: 'Actual cost', width: '110px' },
  { label: 'Variance', width: '110px' },
  { label: 'Budget hours', width: '120px' },
  { label: 'Actual hours', width: '120px' },
]

export const WORKLOAD_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Member' },
  { label: 'Assigned', width: '90px' },
  { label: 'Planned', width: '100px' },
  { label: 'Logged', width: '100px' },
  { label: 'Capacity', width: '100px' },
  { label: 'Utilisation', width: '110px' },
]

export const CAPACITY_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Member' },
  { label: 'Hours per week', width: '140px' },
  { label: 'Effective from', width: '140px' },
  { label: 'Effective to', width: '140px' },
]
