'use client'

import { AppSwitcher, type AppSwitcherApp } from '@876/ui/app-switcher'
import { Button } from '@876/ui/button'
import { PlusIcon } from '@876/ui/icons'

const INVOICE_APPS: AppSwitcherApp[] = [
  { name: 'Invoice', url: '/', current: true },
  ...appEntry('Billing', process.env.NEXT_PUBLIC_BILLING_URL),
  ...appEntry('Console', process.env.NEXT_PUBLIC_CONSOLE_URL),
  ...appEntry('Couriers', process.env.NEXT_PUBLIC_COURIERS_URL),
  ...appEntry('876', process.env.NEXT_PUBLIC_APP_URL),
]

/**
 * An app whose origin variable is unset is omitted from the switcher; there is
 * deliberately no fallback origin (.agents/rules/env-configuration.md rule 4).
 */
function appEntry(name: string, url: string | undefined): AppSwitcherApp[] {
  return url ? [{ name, url }] : []
}

export function TopbarActions({
  showGlobalAdd,
  showAppSwitcher,
}: {
  showGlobalAdd: boolean
  showAppSwitcher: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      {showGlobalAdd ? (
        <>
          <Button
            variant="info"
            size="icon"
            className="h-8 w-8 rounded-lg shadow-sm"
            aria-label="Create new"
          >
            <PlusIcon className="size-4" strokeWidth={2.5} />
          </Button>
          <div aria-hidden className="bg-border mx-1 h-4 w-px" />
        </>
      ) : null}

      <a
        href="https://docs.876.dev"
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:bg-muted hover:text-foreground hidden h-8 items-center justify-center rounded-lg px-3 text-[0.8125rem] font-medium transition-colors sm:flex"
      >
        Help
      </a>

      {showAppSwitcher ? <AppSwitcher apps={INVOICE_APPS} /> : null}
    </div>
  )
}
