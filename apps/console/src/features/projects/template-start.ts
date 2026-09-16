import { nowUnixSeconds } from '@876/core/timestamps'

const DAY_SECONDS = 86400

/** Today at UTC midnight as Unix seconds, the default template preview anchor. */
export function utcMidnightToday(now: number = nowUnixSeconds()): number {
  return Math.floor(now / DAY_SECONDS) * DAY_SECONDS
}

/**
 * Narrow `?start=` to Unix seconds, falling back to today at UTC midnight
 * for missing or malformed values.
 */
export function parseTemplateStartDate(
  value: string | undefined,
  now: number = nowUnixSeconds()
): number {
  if (value !== undefined && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed >= 0) return parsed
  }
  return utcMidnightToday(now)
}
