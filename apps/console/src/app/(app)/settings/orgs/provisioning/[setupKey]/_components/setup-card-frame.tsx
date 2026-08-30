'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AdminProvisioningSetup } from '@876/admin'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import { Pencil, XIcon } from '@876/ui/icons'

export function SetupCardFrame({
  setup,
  children,
}: {
  setup: AdminProvisioningSetup
  children: ReactNode
}) {
  const router = useRouter()
  const base = `/settings/orgs/provisioning/${encodeURIComponent(setup.key)}`

  return (
    <section
      aria-label={`Provisioning setup: ${setup.name}`}
      className={cn(
        '876-card flex h-full min-w-0 flex-col overflow-hidden',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out'
      )}
    >
      {/* Header */}
      <header className="border-876-surface-border flex shrink-0 items-start gap-4 border-b px-6 py-5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
              {setup.name}
            </h2>
            {setup.is_default ? <Badge variant="info">Default</Badge> : null}
            {setup.status === 'archived' ? (
              <Badge variant="secondary">Archived</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground truncate text-xs">
            <span className="font-mono">{setup.key}</span> ·{' '}
            {setup.country_code ?? '—'} · {setup.currency_code ?? '—'} ·{' '}
            {setup.organization_count} organization(s)
          </p>
        </div>
        <Link
          href={`${base}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Pencil className="size-3.5" />
          Edit
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push('/settings/orgs/provisioning')}
          aria-label="Close provisioning setup"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      {/* Body: Direct editor content with its resource category sidebar */}
      <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
        {children}
      </div>

      {/* Footer */}
      <footer className="border-876-surface-border bg-muted/30 text-muted-foreground shrink-0 border-t px-6 py-2.5 font-mono text-xs">
        {setup.id}
      </footer>
    </section>
  )
}
