/**
 * Decimal-string to minor-units parsing with string maths only.
 *
 * Form inputs arrive as decimal display strings ("123.45"); every request body
 * carries integer minor units. This module converts between the two without
 * ever routing an amount through a JS float.
 */

export function fractionDigitsForCurrency(currency: string): number {
  try {
    return (
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.trim().toUpperCase(),
      }).resolvedOptions().maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

/**
 * Parses a decimal display string ("123.45") into integer minor units (12345).
 * Returns `null` for blank or invalid input. Extra fraction digits are
 * truncated, never rounded up through a float.
 */
export function parseDecimalToMinor(
  input: string,
  fractionDigits: number
): number | null {
  const trimmed = input.trim().replace(/,/g, '')
  if (trimmed === '') return null
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const [whole, fraction = ''] = trimmed.split('.')
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '')
  const paddedFraction = (fraction + '0'.repeat(fractionDigits)).slice(
    0,
    fractionDigits
  )
  const digits =
    fractionDigits === 0
      ? normalizedWhole
      : `${normalizedWhole}${paddedFraction}`
  const stripped = digits.replace(/^0+(?=\d)/, '')
  const value = Number(stripped === '' ? '0' : stripped)
  return Number.isSafeInteger(value) ? value : null
}

/**
 * Formats integer minor units back into a decimal input string ("123.45").
 * Returns '' for `null` so empty inputs stay empty.
 */
export function formatMinorForInput(
  minor: number | null | undefined,
  fractionDigits: number
): string {
  if (minor === null || minor === undefined) return ''
  const raw = String(Math.trunc(minor))
  if (!/^\d+$/.test(raw)) return ''
  if (fractionDigits === 0) return raw
  const padded = raw.padStart(fractionDigits + 1, '0')
  const whole = padded.slice(0, padded.length - fractionDigits)
  const fraction = padded.slice(padded.length - fractionDigits)
  return `${whole}.${fraction}`
}

/** Parses whole-hour budget input ("120") into hours. */
export function parseWholeHours(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}

/** Parses an alert-threshold percent ("80") into an integer 1–100. */
export function parseThresholdPercent(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) return null
  return value
}
