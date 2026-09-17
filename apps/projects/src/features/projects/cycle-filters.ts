import type { CycleSearchParams, CycleStatus } from '@/types/planning'

export type { CycleSearchParams, CycleStatus }

const CYCLE_STATUSES = new Set<CycleStatus>(['upcoming', 'active', 'completed'])

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function parseCycleFilters(params: CycleSearchParams) {
  const project = first(params.project)?.trim() || undefined
  const statusValue = first(params.status)?.trim()
  const status =
    statusValue && CYCLE_STATUSES.has(statusValue as CycleStatus)
      ? (statusValue as CycleStatus)
      : undefined

  return {
    project,
    status,
    values: {
      project: project ?? '',
      status: status ?? 'all',
    },
  }
}

export const CYCLE_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
]
