import type {
  Milestone,
  Project,
  RecurrenceFrequency,
} from '@876/projects/contracts'

export type RecurrenceEnds = 'never' | 'on' | 'after'

export type StoredRecurrence = {
  freq: RecurrenceFrequency
  interval?: number | null
  byWeekday?: number[] | null
  until?: number | null
  count?: number | null
}

export type RecurrenceDraft = {
  enabled: boolean
  freq: RecurrenceFrequency
  interval: string
  byWeekday: readonly number[]
  ends: RecurrenceEnds
  until: string
  count: string
}

export type ReminderTarget =
  { issueId: string } | { milestoneId: string } | { eventId: string }

export type EventMemberOption = { userId: string; name: string }

export type EventWorkItemOption = {
  id: string
  identifier: string
  title: string
}

export type EventFormOptions = {
  projects: readonly Project[]
  phases: readonly Milestone[]
  workItems: readonly EventWorkItemOption[]
  members: readonly EventMemberOption[]
}
