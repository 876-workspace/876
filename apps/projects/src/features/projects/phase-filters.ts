export type PhaseStatus = 'open' | 'completed' | 'canceled'

export type PhaseSearchParams = {
  project?: string | string[]
  status?: string | string[]
}

const PHASE_STATUSES = new Set<PhaseStatus>(['open', 'completed', 'canceled'])

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function parsePhaseFilters(params: PhaseSearchParams) {
  const project = first(params.project)?.trim() || undefined
  const statusValue = first(params.status)?.trim()
  const status =
    statusValue && PHASE_STATUSES.has(statusValue as PhaseStatus)
      ? (statusValue as PhaseStatus)
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
