import type { RouteTabItem } from '@876/ui/route-tabs'

/** The user detail tab set. Static, so the strip renders before any data. */
export function userTabs(base: string): RouteTabItem[] {
  return [
    { label: 'Overview', href: base, exact: true },
    { label: 'Transactions', href: `${base}/transactions` },
    { label: 'Requests', href: `${base}/tickets` },
    { label: 'Security', href: `${base}/security` },
    { label: 'Sessions', href: `${base}/sessions` },
    { label: 'Activity', href: `${base}/activity` },
  ]
}
