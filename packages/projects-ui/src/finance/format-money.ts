/**
 * Finance display helpers for the Projects surfaces.
 *
 * Currency rendering is owned by `@876/core/money`; this module only adds the
 * "Unpriced" sentinel for a price that is absent, and the time/date shapes the
 * finance panels need.
 */

import { formatMoney } from '@876/core/money'

export { formatMoney }

export const UNPRICED_LABEL = 'Unpriced'

/**
 * Formats a nullable price: `null` renders "Unpriced", never 0.
 */
export function formatMoneyOrUnpriced(
  minor: string | number | bigint | null | undefined,
  currency: string
): string {
  if (minor === null || minor === undefined) return UNPRICED_LABEL
  return formatMoney(minor, currency)
}

/** Formats whole minutes as "2h 05m" / "45m" with integer maths only. */
export function formatMinutes(minutes: number): string {
  const total = Math.trunc(minutes)
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours === 0) return `${rest}m`
  return `${hours}h ${String(rest).padStart(2, '0')}m`
}

/** Formats a UTC unix-seconds timestamp as "Jan 5, 2026". */
export function formatDay(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ] as const
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}
