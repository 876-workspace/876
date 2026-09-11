export function formatMoney(
  amount: bigint | string | number | null | undefined,
  currency: string
): string {
  if (amount === null || amount === undefined) return '—'
  const numericAmount = Number(amount)
  if (!Number.isSafeInteger(numericAmount) && !Number.isFinite(numericAmount)) {
    return `${currency} ${String(amount)}`
  }
  try {
    const currencyFormatter = new Intl.NumberFormat('en-JM', {
      style: 'currency',
      currency,
    })
    const fractionDigits =
      currencyFormatter.resolvedOptions().maximumFractionDigits ?? 2
    return currencyFormatter.format(numericAmount / 10 ** fractionDigits)
  } catch {
    return `${currency} ${Number(amount) / 100}`
  }
}

export function formatDate(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '—'
  return new Date(value * 1000).toLocaleDateString('en-JM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function unixTimestampToDateInput(timestamp: number): string {
  return new Date(Math.floor(timestamp) * 1000).toISOString().slice(0, 10)
}
