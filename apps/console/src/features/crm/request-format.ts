import type { RequestSource } from './types'

export function formatSource(source: RequestSource): string {
  switch (source) {
    case 'CRM':
      return 'CRM'
    case 'EMAIL':
      return 'Email'
    case 'PHONE':
      return 'Phone'
    case 'CHAT':
      return 'Chat'
    case 'WEB':
      return 'Web form'
    case 'API':
      return 'API'
    default:
      return (source as string).replaceAll('_', ' ')
  }
}

export function formatCustomerType(type?: string): string {
  switch (type) {
    case 'CORE_ORGANIZATION':
      return '876 organization'
    case 'CORE_USER':
      return '876 user'
    default:
      return 'External customer'
  }
}

/**
 * Elapsed time in the shortest form that still answers "is this going stale?".
 *
 * A queue is read by age, not by calendar date: "3h ago" is the answer, and
 * "Aug 26, 2026" is a lookup. Callers that render this in a Client Component
 * must pair it with `suppressHydrationWarning`, since the server and the
 * browser evaluate `Date.now()` seconds apart.
 */
export function formatAge(unixSeconds: number): string {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds)
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  return `${Math.floor(months / 12)}y ago`
}

/**
 * A due/remind date as a scheduler needs to read it: the day, and the time when
 * one was set. Rendered in a Client Component, so pair it with
 * `suppressHydrationWarning` — the current year is read from the clock.
 */
export function formatDueDate(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const midnight =
    date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    ...(midnight ? {} : { hour: 'numeric', minute: '2-digit' }),
  }).format(date)
}

/** True once a due/remind moment has passed. */
export function isOverdue(unixSeconds: number): boolean {
  return unixSeconds * 1000 < Date.now()
}

/**
 * Unix seconds → the `YYYY-MM-DDTHH:mm` an `<input type="datetime-local">`
 * expects, in the viewer's own zone.
 *
 * `toISOString()` cannot be used here: it converts to UTC, so a 9am reminder in
 * Kingston would populate the field as 2pm.
 */
export function toDateTimeLocal(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T')
}

/**
 * A `datetime-local` value → Unix seconds, or `null` when the field is empty or
 * holds something the browser could not parse.
 */
export function fromDateTimeLocal(value: string): number | null {
  if (!value) return null

  const parsed = new Date(value).getTime()
  if (Number.isNaN(parsed)) return null

  return Math.floor(parsed / 1000)
}
