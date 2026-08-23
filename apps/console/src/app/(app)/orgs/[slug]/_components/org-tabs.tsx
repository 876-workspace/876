import type { RouteTabItem } from '@876/ui/route-tabs'

/**
 * The organization detail tab set.
 *
 * Every tab is static so the whole strip can be built without awaiting anything,
 * which lets the header render immediately when clicking a row.
 */
export function orgTabs(base: string, _slug: string): RouteTabItem[] {
  return [
    { label: 'Overview', href: base, exact: true },
    { label: 'Members', href: `${base}/members` },
    { label: 'Customers', href: `${base}/customers` },
    { label: 'Subscriptions', href: `${base}/subscriptions` },
    { label: 'Onboarding', href: `${base}/onboarding` },
    { label: 'Billing', href: `${base}/billing` },
    { label: 'Activity', href: `${base}/activity` },
    { label: 'Notes', href: `${base}/notes` },
  ]
}

