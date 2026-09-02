/**
 * Console's date policy for the shared finance tables.
 *
 * The finance plane serves Unix seconds; the shared tables take a formatter
 * rather than a locale so each host keeps its own convention in one place.
 */
export function formatBillingDate(date: number | null): string {
  if (date == null) return '—'

  return new Date(date * 1000).toLocaleDateString('en-JM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
