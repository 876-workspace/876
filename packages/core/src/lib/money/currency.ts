/**
 * Currency rendering, owned here so the read path and the write path cannot
 * disagree about how many decimal places a currency has.
 *
 * The digits come from `Intl`, not from a hand-written exponent table: a local
 * table goes stale, and two local tables drift apart — which is how this
 * repository ended up with three `formatMoney` implementations deciding
 * decimal places three different ways. `document-totals.ts` owns the money
 * arithmetic; this file owns its one rendering.
 *
 * The locale is the platform's, not the viewer's — JMD renders as `$` and USD
 * as `US$`, so an amount is never read as the wrong currency.
 */

const LOCALE = 'en-JM'

/** Constructing an `Intl.NumberFormat` is the expensive part; cache per code. */
const moneyFormatters = new Map<string, Intl.NumberFormat>()

function currencyFormatter(currency: string): Intl.NumberFormat {
  const code = currency.toUpperCase()
  let formatter = moneyFormatters.get(code)
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: code,
    })
    moneyFormatters.set(code, formatter)
  }
  return formatter
}

/** Minor-unit digits for a currency code. */
export function currencyMinorUnitDigits(currency: string): number {
  return (
    currencyFormatter(currency).resolvedOptions().maximumFractionDigits ?? 2
  )
}

/** Renders a minor-unit amount as a localised currency string. */
export function formatMoney(
  amountMinor: string | number | bigint | null | undefined,
  currency: string | null | undefined
): string {
  if (amountMinor === null || amountMinor === undefined) return '—'
  if (!currency) return String(amountMinor)

  const formatter = currencyFormatter(currency)
  const numeric = Number(amountMinor)
  if (!Number.isSafeInteger(numeric)) {
    return `${currency.toUpperCase()} ${String(amountMinor)}`
  }

  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return formatter.format(numeric / 10 ** digits)
}

/**
 * The largest minor-unit amount this conversion accepts. Beyond it an amount
 * no longer round-trips through the JSON-number wire format some callers still
 * use, so it is refused rather than silently truncated.
 */
const MAX_MINOR_UNITS = BigInt(Number.MAX_SAFE_INTEGER)

/** Converts a user-entered major-unit decimal to an exact minor-unit integer. */
export function majorToMinor(value: string, currency: string): bigint {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error('Enter a non-negative decimal amount.')
  }

  const digits = currencyMinorUnitDigits(currency)
  const [whole = '', fraction = ''] = normalized.split('.')
  if (fraction.length > digits) {
    throw new Error(
      `${currency.toUpperCase()} supports ${digits} decimal places.`
    )
  }

  const amount = BigInt(`${whole}${fraction.padEnd(digits, '0')}`)
  if (amount > MAX_MINOR_UNITS) throw new Error('Amount is too large.')
  return amount
}
