'use client'

import { AppSwitcher, type AppSwitcherApp } from '@876/ui/app-switcher'
import { PlusIcon } from '@876/ui/icons'
import { Button } from '@876/ui/button'

const BILLING_APPS: AppSwitcherApp[] = [
  { name: 'Billing', url: '/', current: true },
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
  showGlobalAdd = true,
  showAppSwitcher = true,
}: {
  showGlobalAdd?: boolean
  showAppSwitcher?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Universal Add Button */}
      {showGlobalAdd && (
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
      )}

      {/* Help Link */}
      <a
        href="https://docs.876.dev"
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:bg-muted hover:text-foreground hidden h-8 items-center justify-center rounded-lg px-3 text-[0.8125rem] font-medium transition-colors sm:flex"
      >
        Help
      </a>

      {/* App Switcher */}
      {showAppSwitcher && <AppSwitcher apps={BILLING_APPS} />}
    </div>
  )
}
