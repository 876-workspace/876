'use client'

import { AppSwitcher, type AppSwitcherApp } from '@876/ui/app-switcher'
import { Button } from '@876/ui/button'
import { PlusIcon } from '@876/ui/icons'

const INVOICE_APPS: AppSwitcherApp[] = [
  { name: 'Invoice', url: '/', current: true },
  {
    name: 'Billing',
    url: process.env.NEXT_PUBLIC_BILLING_URL ?? 'https://billing.876.app',
  },
  {
    name: 'Console',
    url: process.env.NEXT_PUBLIC_CONSOLE_URL ?? 'https://console.876.app',
  },
  {
    name: 'Couriers',
    url: process.env.NEXT_PUBLIC_COURIERS_URL ?? 'https://couriers.876.app',
  },
  {
    name: '876',
    url: process.env.NEXT_PUBLIC_876_APP_URL ?? 'https://876.app',
  },
]

export function TopbarActions() {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="info"
        size="icon"
        className="h-8 w-8 rounded-lg shadow-sm"
        aria-label="Create new"
      >
        <PlusIcon className="size-4" strokeWidth={2.5} />
      </Button>
      <div aria-hidden className="bg-border mx-1 h-4 w-px" />

      <a
        href="https://docs.876.dev"
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:bg-muted hover:text-foreground hidden h-8 items-center justify-center rounded-lg px-3 text-[0.8125rem] font-medium transition-colors sm:flex"
      >
        Help
      </a>

      <AppSwitcher apps={INVOICE_APPS} />
    </div>
  )
}
