/**
 * Finance amounts cross the Billing integration boundary as minor-unit
 * strings; rendering is owned by `@876/core/money`, which shows a value it
 * cannot represent exactly verbatim rather than rounding it.
 */
export { formatMoney } from '@876/core/money'

/** Unix seconds to a short date; a missing date is an em dash. */
export function formatDate(value: number | null): string {
  if (value === null) return '—'
  return new Date(value * 1000).toLocaleDateString('en-JM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
