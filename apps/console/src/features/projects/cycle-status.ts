import type { StatusFilterOption } from '@876/ui/status-filter-heading'

export type CycleStatus = 'upcoming' | 'active' | 'completed'
export type CycleFilterStatus = CycleStatus | 'all'

export const CYCLE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All cycles', headingLabel: 'All Cycles' },
  { value: 'upcoming', label: 'Upcoming', headingLabel: 'Upcoming Cycles' },
  { value: 'active', label: 'Active', headingLabel: 'Active Cycles' },
  { value: 'completed', label: 'Completed', headingLabel: 'Completed Cycles' },
]

const CYCLE_STATUSES: readonly string[] = ['upcoming', 'active', 'completed']

export function isCycleStatus(
  status: string | undefined
): status is CycleStatus {
  if (!status) return false
  return CYCLE_STATUSES.includes(status)
}
