/**
 * Finance amounts cross the Billing integration boundary as minor-unit strings.
 * A value that is not a safe integer is shown verbatim rather than rounded, so
 * a precision the formatter cannot represent is never silently changed.
 */
export function formatMoney(
  amount: bigint | string | null,
  currency: string
): string {
  if (amount === null) return '—'
  const numeric = Number(amount)
  if (!Number.isSafeInteger(numeric)) return `${currency} ${amount}`

  const formatter = new Intl.NumberFormat('en-JM', {
    style: 'currency',
    currency,
  })
  const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return formatter.format(numeric / 10 ** exponent)
}

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
