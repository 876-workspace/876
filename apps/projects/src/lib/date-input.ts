/**
 * `type="date"` control conversion.
 *
 * A date control speaks `YYYY-MM-DD`, the domain speaks unix seconds in UTC.
 * Both directions live here so a form and the route that reads its query
 * string agree on the same day boundary — a formatter local to one of them is
 * how a day slips by an hour.
 */

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Parses a `type="date"` value into unix seconds, or `null` when invalid. */
export function parseDateInput(value: string): number | null {
  const trimmed = value.trim()
  if (!DATE_INPUT_PATTERN.test(trimmed)) return null

  const [year, month, day] = trimmed.split('-').map(Number)
  const millis = Date.UTC(year, month - 1, day)
  const rolled = new Date(millis)
  if (
    rolled.getUTCFullYear() !== year ||
    rolled.getUTCMonth() !== month - 1 ||
    rolled.getUTCDate() !== day
  )
    return null

  return Math.floor(millis / 1000)
}

/** Formats unix seconds as a `type="date"` value. */
export function formatDateInput(timestamp: number | null | undefined): string {
  if (timestamp === null || timestamp === undefined) return ''
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

/** Today's UTC midnight in unix seconds, the default start of a dated plan. */
export function todaySeconds(now: number = Date.now()): number {
  return Math.floor(now / 1000 / 86400) * 86400
}
