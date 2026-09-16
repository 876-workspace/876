/**
 * The single date formatter for Projects UI surfaces.
 *
 * Dates are read in UTC and in a fixed locale so the server render and the
 * browser's hydration of it always produce the same string.
 */
export function formatDate(seconds: number | null): string {
  if (seconds === null) return '—'
  return new Date(seconds * 1000).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * The single date-time formatter for Projects UI comment and activity
 * timestamps, the date formatter plus the hour and minute.
 */
export function formatDateTime(seconds: number | null): string {
  if (seconds === null) return '—'
  return new Date(seconds * 1000).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
