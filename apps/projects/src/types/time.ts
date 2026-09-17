export type CreateTimeEntryParams = {
  projectId: string
  startedAt: number
  endedAt: number
  billable?: boolean
  note?: string | null
}

export type UpdateTimeEntryParams = {
  startedAt: number
  endedAt: number
  billable: boolean
  note: string | null
}

export type EntryTimestamps =
  | { ok: true; startedAt: number; endedAt: number }
  | { ok: false; reason: 'incomplete' | 'range' }

export type TimePeriod = { from: number; to: number }

export type TimeEntryProjectOption = { id: string; name: string }

export type TimerState = {
  running: boolean
  startedAt: number | null
  label: string
}

export type TimeEntryLookups = {
  projectNames: ReadonlyMap<string, string>
  issueTitles: ReadonlyMap<string, string>
}
