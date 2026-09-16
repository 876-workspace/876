/**
 * Minor-units money formatting.
 *
 * Amounts travel as integer minor units (`number`) or integer strings and are
 * converted to display text with string maths only — no float arithmetic ever
 * touches money here. A `null` price renders as "Unpriced", never 0.
 */

export const UNPRICED_LABEL = 'Unpriced'

export function currencyFractionDigits(
  currency: string,
  locale?: string
): number {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

function splitMinor(
  minor: number | string,
  fractionDigits: number
): { sign: string; intPart: string; fracPart: string } | null {
  const raw = typeof minor === 'number' ? String(Math.trunc(minor)) : minor.trim()
  if (!/^-?\d+$/.test(raw)) return null
  const sign = raw.startsWith('-') ? '-' : ''
  const digits = sign ? raw.slice(1) : raw
  const padded = digits.padStart(fractionDigits + 1, '0')
  const intPart =
    fractionDigits === 0
      ? padded
      : padded.slice(0, padded.length - fractionDigits).replace(/^0+(?=\d)/, '')
  const fracPart =
    fractionDigits === 0 ? '' : padded.slice(padded.length - fractionDigits)
  return { sign, intPart, fracPart }
}

function groupInteger(intPart: string, locale?: string): string {
  const value = intPart === '' ? 0 : Number(intPart)
  if (!Number.isSafeInteger(value)) return intPart
  return new Intl.NumberFormat(locale, { useGrouping: true }).format(value)
}

function currencySymbol(
  currency: string,
  locale?: string,
  display: 'symbol' | 'code' = 'symbol'
): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: display,
    }).formatToParts(0)
    return parts.find((part) => part.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

/**
 * Formats integer minor units as a currency amount, e.g. `12345` USD → "$123.45".
 * Returns `null` when the input is not an integer amount.
 */
export function formatMoney(
  minor: number | string,
  currency: string,
  locale?: string
): string | null {
  const fractionDigits = currencyFractionDigits(currency, locale)
  const split = splitMinor(minor, fractionDigits)
  if (!split) return null
  const symbol = currencySymbol(currency, locale)
  const grouped = groupInteger(split.intPart, locale)
  const major =
    fractionDigits === 0 ? grouped : `${grouped}.${split.fracPart}`
  return `${split.sign}${symbol}${major}`
}

/**
 * Formats a nullable price: `null` renders "Unpriced", never 0.
 */
export function formatMoneyOrUnpriced(
  minor: number | string | null | undefined,
  currency: string,
  locale?: string
): string {
  if (minor === null || minor === undefined) return UNPRICED_LABEL
  return formatMoney(minor, currency, locale) ?? UNPRICED_LABEL
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
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ] as const
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}
