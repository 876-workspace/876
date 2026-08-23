import type { AdminSubscription } from '@876/admin'

export function humanize(value: string): string {
  return value.replace(/_/g, ' ')
}

export function planName(sub: AdminSubscription): string {
  const first = sub.items?.[0]
  return (
    first?.product_name || first?.product_slug || sub.app_slug || sub.app_id
  )
}
