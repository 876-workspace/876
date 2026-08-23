import type { AdminSubscription } from '@876/admin'

export function humanize(value: string | null | undefined): string {
  // Several of the fields this formats are nullable on the resource, so an
  // absent one must render as a dash rather than crash the row.
  if (!value) return '—'

  return value.replace(/_/g, ' ')
}

export function planName(sub: AdminSubscription): string {
  const first = sub.items?.[0]
  return (
    first?.product_name || first?.product_slug || sub.app_slug || sub.app_id
  )
}
