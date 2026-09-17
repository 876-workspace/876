import { nowUnixSeconds } from '@876/core/timestamps'

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

import type { EntryTimestamps } from '@/types/time'

export type { EntryTimestamps }

export function entryDateValue(timestamp: number | null): string {
  if (timestamp === null) return ''

  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

export function entryTimeValue(timestamp: number | null): string {
  if (timestamp === null) return ''

  return new Date(timestamp * 1000).toISOString().slice(11, 16)
}

/**
 * The server's today, read once and handed to the form as its default date so
 * the field cannot disagree with itself across hydration.
 */
export function todayEntryDate(): string {
  return entryDateValue(nowUnixSeconds())
}

/**
 * A date and two clock times are read as UTC — the frame the entry table
 * renders in — so an entry reads back exactly as it was typed. Only the two
 * instants travel: the service derives the duration from them.
 */
export function entryTimestamps(
  date: string,
  start: string,
  end: string
): EntryTimestamps {
  const day = Date.parse(`${date}T00:00:00Z`)
  const startMatch = TIME_PATTERN.exec(start)
  const endMatch = TIME_PATTERN.exec(end)
  if (Number.isNaN(day) || !startMatch || !endMatch)
    return { ok: false, reason: 'incomplete' }

  const daySeconds = Math.floor(day / 1000)
  const startedAt =
    daySeconds + Number(startMatch[1]) * 3600 + Number(startMatch[2]) * 60
  const endedAt =
    daySeconds + Number(endMatch[1]) * 3600 + Number(endMatch[2]) * 60
  if (endedAt <= startedAt) return { ok: false, reason: 'range' }

  return { ok: true, startedAt, endedAt }
}
