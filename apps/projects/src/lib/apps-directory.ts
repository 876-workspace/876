import 'server-only'

import type { AppSwitcherApp } from '@876/ui/app-switcher'

export function getAppsDirectory(): AppSwitcherApp[] {
  return [
    { name: '876 Projects', url: '/', current: true },
    {
      name: '876 Billing',
      url: process.env.NEXT_PUBLIC_BILLING_URL ?? 'https://billing.876.app',
    },
    {
      name: '876 Couriers',
      url: process.env.NEXT_PUBLIC_COURIERS_URL ?? 'https://couriers.876.app',
    },
  ]
}
