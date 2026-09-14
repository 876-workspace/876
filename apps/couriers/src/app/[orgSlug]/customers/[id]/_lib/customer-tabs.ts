import type { RouteTabItem } from '@876/ui/route-tabs'

export function customerTabs(base: string): RouteTabItem[] {
  return [
    { label: 'Overview', href: base, exact: true },
    { label: 'Addresses', href: `${base}/addresses` },
    { label: 'Packages', href: `${base}/packages` },
    { label: 'Deliveries', href: `${base}/deliveries` },
    { label: 'Invoices', href: `${base}/invoices` },
    { label: 'Payments', href: `${base}/payments` },
    { label: 'Requests', href: `${base}/requests` },
    { label: 'Notes', href: `${base}/notes` },
    { label: 'Activity', href: `${base}/activity` },
  ]
}
