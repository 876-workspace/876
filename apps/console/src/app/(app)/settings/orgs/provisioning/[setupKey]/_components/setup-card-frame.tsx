'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@876/core/utils'
import { Button } from '@876/ui/button'
import { XIcon } from '@876/ui/icons'
import { getProvisioningSetupTabs } from '../_lib/setup-tabs'

export function SetupCardFrame({
  setupKey,
  title,
  actions,
  footer,
  children,
}: {
  setupKey: string
  title: ReactNode
  actions: ReactNode
  footer: ReactNode
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const base = `/settings/orgs/provisioning/${encodeURIComponent(setupKey)}`
  const normalizedPathname = pathname?.replace(/\/+$/, '') ?? ''
  const tabs = getProvisioningSetupTabs(setupKey)

  return (
    <section
      aria-label="Provisioning setup"
      className={cn(
        '876-card flex min-w-0 flex-col',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out'
      )}
    >
      {/* Header */}
      <header className="border-876-surface-border flex shrink-0 items-center gap-4 border-b px-6 py-4 sticky top-0 z-10 bg-[var(--876-surface)] rounded-t-[calc(var(--radius-xl)-1px)]">
        <div className="min-w-0 flex-1">{title}</div>
        <div className="flex items-center gap-1">
          {actions}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push('/settings/orgs/provisioning')}
            aria-label="Close provisioning setup"
            className="text-muted-foreground hover:text-foreground size-8 shrink-0"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* Resource type tabs — rendered synchronously and immediately */}
      <div className="border-876-surface-border shrink-0 border-b px-6 pt-1">
        <nav
          aria-label="Resource categories"
          className="no-scrollbar -mb-px flex items-end gap-0.5 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.isRoot
              ? normalizedPathname === base
              : normalizedPathname === tab.href ||
                normalizedPathname.startsWith(`${tab.href}/`)

            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-2 border-b-2 px-3.5 py-3 text-[0.8125rem] font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'size-3.5 shrink-0 transition-colors',
                    isActive
                      ? tab.colorClass
                      : 'text-muted-foreground/70 group-hover:text-foreground'
                  )}
                />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {children}
      </div>

      {/* Footer */}
      <footer className="border-876-surface-border bg-muted/30 text-muted-foreground shrink-0 border-t px-6 py-2.5 font-mono text-xs">
        {footer}
      </footer>
    </section>
  )
}
