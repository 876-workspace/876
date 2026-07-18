export function formatMoney(
  amount: bigint | string | null | undefined,
  currency: string,
  decimalPlaces?: number
): string {
  if (amount === null || amount === undefined) return 'Custom pricing'

  const numericAmount = Number(amount)
  if (!Number.isSafeInteger(numericAmount)) {
    return `${currency} ${String(amount)} minor units`
  }

  const currencyFormatter = new Intl.NumberFormat('en-JM', {
    style: 'currency',
    currency,
  })
  const fractionDigits =
    decimalPlaces ??
    currencyFormatter.resolvedOptions().maximumFractionDigits ??
    2
  const formatter =
    decimalPlaces === undefined
      ? currencyFormatter
      : new Intl.NumberFormat('en-JM', {
          style: 'currency',
          currency,
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        })

  return formatter.format(numericAmount / 10 ** fractionDigits)
}

/** Parses a decimal form value into an exact minor-unit integer string. */
export function parseMinorAmountInput(
  value: string,
  decimalPlaces: number,
  allowZero = false
): string | null {
  const normalized = value.trim()
  const pattern =
    decimalPlaces === 0
      ? /^\d+$/
      : new RegExp(`^\\d+(?:\\.\\d{1,${decimalPlaces}})?$`)
  if (!pattern.test(normalized)) return null

  const [whole, fraction = ''] = normalized.split('.')
  const scale = 10n ** BigInt(decimalPlaces)
  const amount =
    BigInt(whole) * scale + BigInt(fraction.padEnd(decimalPlaces, '0') || '0')
  return amount > 0n || allowZero ? amount.toString() : null
}

/** Parses a signed decimal form value into an exact minor-unit integer string. */
export function parseSignedMinorAmountInput(
  value: string,
  decimalPlaces: number
): string | null {
  const normalized = value.trim()
  const sign = normalized.startsWith('-') ? -1n : 1n
  const unsigned = normalized.replace(/^[+-]/, '')
  const amount = parseMinorAmountInput(unsigned, decimalPlaces, true)
  if (amount === null) return null

  return (BigInt(amount) * sign).toString()
}

/** Formats a minor-unit integer for an HTML decimal amount input. */
export function formatMinorAmountInput(
  value: bigint | string,
  decimalPlaces: number
): string {
  const amount = BigInt(value)
  if (decimalPlaces === 0) return amount.toString()

  const scale = 10n ** BigInt(decimalPlaces)
  const absolute = amount < 0n ? -amount : amount
  const formatted = `${absolute / scale}.${String(absolute % scale).padStart(decimalPlaces, '0')}`
  return amount < 0n ? `-${formatted}` : formatted
}

export function minorAmountInputStep(decimalPlaces: number): string {
  return decimalPlaces === 0 ? '1' : `0.${'0'.repeat(decimalPlaces - 1)}1`
}

export function zeroMinorAmountInput(decimalPlaces: number): string {
  return decimalPlaces === 0 ? '0' : `0.${'0'.repeat(decimalPlaces)}`
}

export function unixTimestampToDateInput(timestamp: number): string {
  return new Date(Math.floor(timestamp) * 1000).toISOString().slice(0, 10)
}

export function formatPriceCadence({
  intervalCount,
  intervalUnit,
  priceType,
}: {
  intervalCount: number | null
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null
  priceType: 'ONE_TIME' | 'RECURRING'
}): string {
  if (priceType === 'ONE_TIME') return 'one-time'
  if (!intervalUnit || !intervalCount) return 'recurring'

  const unit = intervalUnit.toLowerCase()
  return intervalCount === 1 ? `per ${unit}` : `every ${intervalCount} ${unit}s`
}

export function formatSubscriptionStatus(status: string): string {
  return status.toLowerCase().replaceAll('_', ' ')
}

export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return '—'

  return new Date(timestamp * 1000).toLocaleDateString('en-JM', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
