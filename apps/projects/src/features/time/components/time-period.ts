const DAY_SECONDS = 86_400
const WEEK_DAYS = 7

import type { TimePeriod } from '@/types/time'

/** Monday 00:00 UTC of the week the timestamp falls in. */
function weekStart(timestamp: number): number {
  const day = Math.floor(timestamp / DAY_SECONDS) * DAY_SECONDS
  const weekday = new Date(day * 1000).getUTCDay()

  return day - ((weekday + 6) % 7) * DAY_SECONDS
}

export function defaultTimePeriod(now: number): TimePeriod {
  const from = weekStart(now)

  return { from, to: from + WEEK_DAYS * DAY_SECONDS - 1 }
}

function toSeconds(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null

  const seconds = Number(value)

  return Number.isSafeInteger(seconds) ? seconds : null
}

/** The period the page asked for, or the current week when it asked badly. */
export function resolveTimePeriod(
  params: { from?: string; to?: string },
  now: number
): TimePeriod {
  const from = toSeconds(params.from)
  const to = toSeconds(params.to)

  if (from === null || to === null || to < from) return defaultTimePeriod(now)

  return { from, to }
}

export function shiftTimePeriod(period: TimePeriod, steps: number): TimePeriod {
  const span = period.to - period.from + 1
  const from = period.from + steps * span

  return { from, to: from + span - 1 }
}

/** The query a link carries to select a period, without a leading `?`. */
export function timePeriodQuery(period: TimePeriod): string {
  return `from=${period.from}&to=${period.to}`
}

function formatDay(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTimePeriod(period: TimePeriod): string {
  return `${formatDay(period.from)} – ${formatDay(period.to)}`
}
