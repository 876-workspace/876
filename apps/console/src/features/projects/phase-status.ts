import type { StatusFilterOption } from '@876/ui/status-filter-heading'

export type PhaseStatus = 'open' | 'completed' | 'canceled'
export type PhaseFilterStatus = PhaseStatus | 'all'

export const PHASE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All phases', headingLabel: 'All Phases' },
  { value: 'open', label: 'Open', headingLabel: 'Open Phases' },
  { value: 'completed', label: 'Completed', headingLabel: 'Completed Phases' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Phases' },
]

const PHASE_STATUSES: readonly string[] = ['open', 'completed', 'canceled']

export function isPhaseStatus(
  status: string | undefined
): status is PhaseStatus {
  if (!status) return false
  return PHASE_STATUSES.includes(status)
}
