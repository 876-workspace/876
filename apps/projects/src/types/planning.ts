export type CycleStatus = 'upcoming' | 'active' | 'completed'

export type CycleSearchParams = {
  project?: string | string[]
  status?: string | string[]
}

export type PhaseStatus = 'open' | 'completed' | 'canceled'

export type PhaseSearchParams = {
  project?: string | string[]
  status?: string | string[]
}
