import type { RequestSource } from '@/types/crm'

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
      return source.replaceAll('_', ' ')
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
