/**
 * Read-only formatting for the Console Projects operator views.
 *
 * Dates render in UTC with a fixed locale so the server render and the
 * browser hydration always agree; durations stay in whole hours/minutes.
 */
export function formatOperatorDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatOperatorDateOrDash(
  seconds: number | null | undefined
): string {
  if (seconds === null || seconds === undefined) return '—'
  return formatOperatorDate(seconds)
}

export function formatOperatorDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder}m`
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

export function formatOperatorBytes(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unit]}`
}
