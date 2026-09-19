export { formatMoney } from '@876/core/money'

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
