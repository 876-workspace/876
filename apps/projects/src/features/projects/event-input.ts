import type {
  RecurrenceFrequency,
  RecurrenceInput,
  RecurrenceRule,
} from '@876/projects/contracts'
import type {
  RecurrenceDraft,
  RecurrenceEnds,
  StoredRecurrence,
} from '@/types/events'

export const WEEKDAY_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
]

/**
 * A stored rule as either side of the boundary presents it: a serialized event
 * always carries every field, while an unsent input may omit the ones it does
 * not use. The section reads both.
 */

export const RECURRENCE_FREQUENCY_LABELS: Record<
  RecurrenceFrequency,
  { singular: string; plural: string }
> = {
  daily: { singular: 'day', plural: 'days' },
  weekly: { singular: 'week', plural: 'weeks' },
  monthly: { singular: 'month', plural: 'months' },
  yearly: { singular: 'year', plural: 'years' },
}

export const EMPTY_RECURRENCE_DRAFT: RecurrenceDraft = {
  enabled: false,
  freq: 'weekly',
  interval: '1',
  byWeekday: [],
  ends: 'never',
  until: '',
  count: '',
}

function positiveInteger(value: string): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function isSet(value: number | null | undefined): value is number {
  return value !== null && value !== undefined
}

export function recurrenceDraftFromRule(
  rule: StoredRecurrence | null
): RecurrenceDraft {
  if (!rule) return EMPTY_RECURRENCE_DRAFT

  const ends: RecurrenceEnds = isSet(rule.until)
    ? 'on'
    : isSet(rule.count)
      ? 'after'
      : 'never'

  return {
    enabled: true,
    freq: rule.freq,
    interval: String(rule.interval ?? 1),
    byWeekday: rule.byWeekday ?? [],
    ends,
    until: isSet(rule.until) ? dateFieldValue(rule.until) : '',
    count: isSet(rule.count) ? String(rule.count) : '',
  }
}

/**
 * Turns the recurrence section into the payload the contracts accept.
 *
 * The section is optional, so a disabled rule is `null` rather than an empty
 * object: the API stores "does not repeat" as the absence of a rule. Weekly is
 * the only frequency that carries weekdays, and an end that was left blank
 * degrades to "never" instead of an invalid payload.
 */
export function buildRecurrenceInput(
  draft: RecurrenceDraft
): RecurrenceInput | null {
  if (!draft.enabled) return null

  const input: RecurrenceInput = {
    freq: draft.freq,
    interval: positiveInteger(draft.interval) ?? 1,
  }

  if (draft.freq === 'weekly') {
    const byWeekday = [...new Set(draft.byWeekday)].sort((a, b) => a - b)
    if (byWeekday.length > 0) input.byWeekday = byWeekday
  }

  if (draft.ends === 'on') {
    const until = dateFieldTimestamp(draft.until)
    if (until !== null) input.until = until
  }

  if (draft.ends === 'after') {
    const count = positiveInteger(draft.count)
    if (count !== null) input.count = count
  }

  return input
}

export function describeRecurrence(rule: RecurrenceRule | null): string | null {
  if (!rule) return null

  const unit = RECURRENCE_FREQUENCY_LABELS[rule.freq]
  const cadence =
    rule.interval === 1
      ? `every ${unit.singular}`
      : `every ${rule.interval} ${unit.plural}`

  const weekdays =
    rule.freq === 'weekly' && rule.byWeekday.length > 0
      ? ` on ${rule.byWeekday
          .map((day) => WEEKDAY_OPTIONS.find((option) => option.value === day))
          .filter((option) => option !== undefined)
          .map((option) => option.label)
          .join(', ')}`
      : ''

  const ending =
    rule.until !== null
      ? ` · until ${dateFieldValue(rule.until)}`
      : rule.count !== null
        ? ` · ${rule.count} ${rule.count === 1 ? 'time' : 'times'}`
        : ''

  return `Repeats ${cadence}${weekdays}${ending}`
}

export function dateFieldValue(timestamp: number | null | undefined): string {
  if (timestamp === null || timestamp === undefined) return ''
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

export function dateFieldTimestamp(value: string): number | null {
  if (!value) return null
  const parsed = Date.parse(`${value}T00:00:00Z`)
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000)
}

export function dateTimeFieldValue(
  timestamp: number | null | undefined
): string {
  if (timestamp === null || timestamp === undefined) return ''
  const date = new Date(timestamp * 1000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function dateTimeFieldTimestamp(value: string): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000)
}
