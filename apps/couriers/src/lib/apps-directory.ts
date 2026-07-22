import 'server-only'

import type { AppSwitcherApp } from '@876/ui/app-switcher'

export function getAppsDirectory(basePath: string): AppSwitcherApp[] {
  return [
    { name: '876 Couriers', url: basePath, current: true },
    {
      name: '876 Billing',
      url: process.env.NEXT_PUBLIC_BILLING_URL ?? 'https://billing.876.app',
    },
  ]
}
