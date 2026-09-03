import type { StatusFilterOption } from '@876/ui/status-filter-heading'
import { PROJECT_STATUSES, type ProjectStatus } from '@876/projects/contracts'

export type ProjectFilterStatus = ProjectStatus | 'all'

export const PROJECT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All projects', headingLabel: 'All Projects' },
  { value: 'planned', label: 'Planned', headingLabel: 'Planned Projects' },
  { value: 'active', label: 'Active', headingLabel: 'Active Projects' },
  { value: 'paused', label: 'Paused', headingLabel: 'Paused Projects' },
  { value: 'completed', label: 'Completed', headingLabel: 'Completed Projects' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Projects' },
]

export function isProjectStatus(
  status: string | undefined
): status is ProjectStatus {
  if (!status) return false
  return (PROJECT_STATUSES as readonly string[]).includes(status)
}
