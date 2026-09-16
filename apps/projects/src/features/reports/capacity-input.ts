/**
 * Capacity form input conversion.
 *
 * A week of capacity is entered in hours and stored as integer minutes. Every
 * conversion here is integer maths: a fractional hour is only accepted when it
 * lands on a whole minute ("37.5" → 2250, "37.33" → rejected), so no amount
 * ever passes through a float.
 */

/** A seven-day week, the ceiling the API enforces on `minutesPerWeek`. */
export const MAX_MINUTES_PER_WEEK = 10080

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Minutes in the fraction of an hour, or `null` when it is not a whole minute. */
function fractionMinutes(fraction: string): number | null {
  if (fraction === '') return 0
  const digits = Number(fraction)
  if (fraction.length === 1) return digits * 6
  if (digits % 5 !== 0) return null
  return (digits / 5) * 3
}

/** Parses hours per week ("37.5") into integer minutes (2250). */
export function parseHoursToMinutes(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null

  const [hours, fraction = ''] = trimmed.split('.')
  const minutes = fractionMinutes(fraction)
  if (minutes === null) return null

  const total = Number(hours) * 60 + minutes
  if (!Number.isSafeInteger(total)) return null
  if (total <= 0 || total > MAX_MINUTES_PER_WEEK) return null
  return total
}

/** Formats integer minutes back into an hours input ("2250" → "37.5"). */
export function formatMinutesAsHours(
  minutes: number | null | undefined
): string {
  if (minutes === null || minutes === undefined) return ''
  const hours = Math.trunc(minutes / 60)
  const remainder = minutes - hours * 60
  if (remainder === 0) return String(hours)

  const hundredths = Math.round((remainder * 100) / 60)
  const fraction = String(hundredths).padStart(2, '0').replace(/0$/, '')
  return `${hours}.${fraction}`
}

/** Parses a `type="date"` input into unix seconds, or `null` when invalid. */
export function parseDateInput(value: string): number | null {
  const trimmed = value.trim()
  if (!DATE_INPUT_PATTERN.test(trimmed)) return null
  const millis = Date.parse(`${trimmed}T00:00:00.000Z`)
  if (!Number.isFinite(millis)) return null
  return Math.floor(millis / 1000)
}
