const EXPONENTS: Record<string, number> = {
  bhd: 3,
  jod: 3,
  jpy: 0,
  krw: 0,
  usd: 2,
  jmd: 2,
}

export function currencyExponent(currency: string): number {
  return EXPONENTS[currency.toLowerCase()] ?? 2
}

/** Converts a user-entered major-unit decimal to an exact minor-unit integer. */
export function majorToMinor(value: string, currency: string): number {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d+)?$/.test(normalized))
    throw new Error('Enter a non-negative decimal amount.')

  const [whole, fraction = ''] = normalized.split('.')
  const exponent = currencyExponent(currency)
  if (fraction.length > exponent)
    throw new Error(
      `${currency.toUpperCase()} supports ${exponent} decimal places.`
    )

  const digits = `${whole}${fraction.padEnd(exponent, '0')}`.replace(
    /^0+(?=\d)/,
    ''
  )
  const result = Number(digits || '0')
  if (!Number.isSafeInteger(result)) throw new Error('Amount is too large.')
  return result
}

/**
 * Renders a minor-unit amount for display.
 *
 * Lives here, beside {@link currencyExponent}, so the read path and the write
 * path cannot disagree about how many decimal places a currency has.
 */
export function formatMoney(amount: number | null, currency: string): string {
  if (amount === null) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 10 ** currencyExponent(currency))
}
